import { ConvexError } from "convex/values";
import type { PaginationOptions } from "convex/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { requireUser, userRole } from "../authHelpers";

export function boundedPage(options: PaginationOptions) {
  return { ...options, numItems: Math.min(Math.max(Math.floor(options.numItems), 1), 100) };
}

export async function requireMember(ctx: QueryCtx | MutationCtx, conversationId: Id<"chatConversations">) {
  const auth = await requireUser(ctx);
  const conversation = await ctx.db.get(conversationId);
  const member = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_userId", q => q.eq("conversationId", conversationId).eq("userId", auth.user._id)).unique();
  if (!conversation || !member?.active) throw new ConvexError("You do not have access to this conversation.");
  return { ...auth, conversation, member };
}
export async function requireGroupAdmin(ctx: MutationCtx, conversationId: Id<"chatConversations">) {
  const auth = await requireMember(ctx, conversationId);
  if (userRole(auth.user) !== "admin" || auth.conversation.type !== "group" || !auth.conversation.official) throw new ConvexError("Only an authorized group administrator can make this change.");
  return auth;
}
export async function addMember(ctx: MutationCtx, conversation: Doc<"chatConversations">, userId: Id<"users">, automatic = false) {
  const user = await ctx.db.get(userId);
  if (!user || user.archivedAt !== undefined) throw new ConvexError("A selected account is no longer available.");
  const existing = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_userId", q => q.eq("conversationId", conversation._id).eq("userId", userId)).unique();
  if (existing?.active || (existing && automatic)) return;
  const value = { active: true, joinedAt: Date.now(), lastReadAt: Date.now(), lastReadSeq: conversation.lastSeq, sentCount: existing?.sentCount ?? 0, readSentCount: existing?.sentCount ?? 0 };
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert("chatMembers", { conversationId: conversation._id, userId, memberRole: conversation.createdBy === userId ? "owner" : "member", ...value });
  const current = (await ctx.db.get(conversation._id))!;
  await ctx.db.patch(conversation._id, { memberCount: current.memberCount + 1 });
}
export function unread(conversation: Doc<"chatConversations">, member: Doc<"chatMembers">) {
  return Math.max(0, conversation.lastSeq - member.lastReadSeq - (member.sentCount - member.readSentCount));
}
export async function publicUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) return { _id: userId, name: `Account ${userId.slice(-6)}`, role: "user" as const, online: false, lastSeen: null, archived: true };
  let online = false;
  if (user.archivedAt === undefined) {
    const live = await ctx.db.query("chatPresence").withIndex("by_userId_and_expiresAt", q => q.eq("userId", userId).gt("expiresAt", Date.now())).take(20);
    for (const tab of live) {
      const session = await ctx.db.get(tab.sessionId);
      if (session && !session.revokedAt && session.expiresAt > Date.now() && session.authVersion === (user.authVersion ?? 0)) { online = true; break; }
    }
  }
  const last = await ctx.db.query("chatPresence").withIndex("by_userId_and_lastSeen", q => q.eq("userId", userId)).order("desc").first();
  return { _id: userId, name: user.name || `Account ${userId.slice(-6)}`, role: userRole(user), online, lastSeen: last?.lastSeen ?? null, archived: user.archivedAt !== undefined };
}
export async function ensureOtherGroupAdmin(ctx: MutationCtx, conversationId: Id<"chatConversations">, excluded: Id<"users">) {
  for await (const member of ctx.db.query("chatMembers").withIndex("by_conversationId_and_active", q => q.eq("conversationId", conversationId).eq("active", true))) {
    if (member.userId === excluded) continue;
    const user = await ctx.db.get(member.userId);
    if (user && user.archivedAt === undefined && userRole(user) === "admin") return;
  }
  throw new ConvexError("Add another administrator to this user's active groups before removing their administrator access.");
}
export async function checkAdminGroupExit(ctx: MutationCtx, userId: Id<"users">) {
  for await (const membership of ctx.db.query("chatMembers").withIndex("by_userId_and_active", q => q.eq("userId", userId).eq("active", true))) {
    const conversation = await ctx.db.get(membership.conversationId);
    if (conversation?.type === "group" && !conversation.archived) await ensureOtherGroupAdmin(ctx, conversation._id, userId);
  }
}

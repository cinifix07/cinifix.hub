import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAdmin, userRole } from "../authHelpers";
import { addMember, boundedPage, ensureOtherGroupAdmin, publicUser, requireGroupAdmin, requireMember } from "./shared";
import { limit } from "./limits";

function validate(name: string, description: string) {
  if (!name.trim() || name.trim().length > 80) throw new ConvexError("Use a group name between 1 and 80 characters.");
  if (description.length > 500) throw new ConvexError("Descriptions can contain up to 500 characters.");
}
export const create = mutation({ args: { name: v.string(), description: v.string(), memberIds: v.array(v.id("users")), includeAllCurrent: v.boolean(), autoJoin: v.boolean() }, handler: async (ctx, args) => {
  const { user } = await requireAdmin(ctx);
  validate(args.name, args.description);
  if (args.memberIds.length > 200) throw new ConvexError("Select up to 200 accounts, or include all current users.");
  if (args.autoJoin && !args.includeAllCurrent) throw new ConvexError("Future-user enrollment requires an all-users group.");
  await limit(ctx, `${user._id}:group`, 5, 60000);
  const id = await ctx.db.insert("chatConversations", { type: "group", name: args.name.trim(), description: args.description.trim(), createdBy: user._id, createdAt: Date.now(), updatedAt: Date.now(), official: true, autoJoin: args.autoJoin, archived: false, lastSeq: 0, memberCount: 0 });
  const conversation = (await ctx.db.get(id))!;
  await addMember(ctx, conversation, user._id);
  for (const userId of new Set(args.memberIds)) await addMember(ctx, conversation, userId);
  if (args.includeAllCurrent) await ctx.scheduler.runAfter(0, internal.chat.groups.enrollCurrent, { conversationId: id, cursor: null });
  return id;
} });
export const enrollCurrent = internalMutation({ args: { conversationId: v.id("chatConversations"), cursor: v.union(v.string(), v.null()) }, handler: async (ctx, args) => {
  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation || conversation.archived) return;
  const result = await ctx.db.query("users").withIndex("by_archivedAt", q => q.eq("archivedAt", undefined)).paginate({ cursor: args.cursor, numItems: 100 });
  for (const user of result.page) await addMember(ctx, conversation, user._id, true);
  if (!result.isDone) await ctx.scheduler.runAfter(0, internal.chat.groups.enrollCurrent, { ...args, cursor: result.continueCursor });
} });
export const enrollFuture = internalMutation({ args: { userId: v.id("users"), cursor: v.union(v.string(), v.null()) }, handler: async (ctx, args) => {
  const user = await ctx.db.get(args.userId);
  if (!user || user.archivedAt !== undefined) return;
  const result = await ctx.db.query("chatConversations").withIndex("by_autoJoin_and_archived", q => q.eq("autoJoin", true).eq("archived", false)).paginate({ cursor: args.cursor, numItems: 100 });
  for (const conversation of result.page) await addMember(ctx, conversation, user._id, true);
  if (!result.isDone) await ctx.scheduler.runAfter(0, internal.chat.groups.enrollFuture, { ...args, cursor: result.continueCursor });
} });
export const members = query({ args: { conversationId: v.id("chatConversations"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireMember(ctx, args.conversationId);
  const result = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_active", q => q.eq("conversationId", args.conversationId).eq("active", true)).paginate(boundedPage(args.paginationOpts));
  return { ...result, page: await Promise.all(result.page.map(async member => ({ ...await publicUser(ctx, member.userId), memberRole: member.memberRole }))) };
} });
export const update = mutation({ args: { conversationId: v.id("chatConversations"), name: v.string(), description: v.string() }, handler: async (ctx, args) => {
  const { conversation, user } = await requireGroupAdmin(ctx, args.conversationId);
  if (conversation.archived) throw new ConvexError("Archived groups are read-only.");
  validate(args.name, args.description);
  await limit(ctx, `${user._id}:manage`, 30, 60000);
  await ctx.db.patch(conversation._id, { name: args.name.trim(), description: args.description.trim() });
} });
export const membership = mutation({ args: { conversationId: v.id("chatConversations"), userId: v.id("users"), active: v.boolean() }, handler: async (ctx, args) => {
  const { conversation, user } = await requireGroupAdmin(ctx, args.conversationId);
  if (conversation.archived) throw new ConvexError("Archived groups are read-only.");
  await limit(ctx, `${user._id}:manage`, 30, 60000);
  if (args.active) { await addMember(ctx, conversation, args.userId); return; }
  const target = await ctx.db.get(args.userId);
  if (target && userRole(target) === "admin") await ensureOtherGroupAdmin(ctx, conversation._id, target._id);
  const member = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_userId", q => q.eq("conversationId", conversation._id).eq("userId", args.userId)).unique();
  if (member?.active) {
    await ctx.db.patch(member._id, { active: false });
    await ctx.db.patch(conversation._id, { memberCount: conversation.memberCount - 1 });
  }
} });
export const archive = mutation({ args: { conversationId: v.id("chatConversations") }, handler: async (ctx, args) => {
  const { conversation } = await requireGroupAdmin(ctx, args.conversationId);
  await ctx.db.patch(conversation._id, { archived: true, autoJoin: false });
} });

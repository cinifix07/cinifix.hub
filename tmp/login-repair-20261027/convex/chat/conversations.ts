import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser } from "../authHelpers";
import { addMember, boundedPage, publicUser, requireMember, unread } from "./shared";
import { limit } from "./limits";

export const self = query({ args: {}, handler: async (ctx) => {
  const { user } = await requireUser(ctx);
  return await publicUser(ctx, user._id);
} });

export const list = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const { user } = await requireUser(ctx);
  const result = await ctx.db.query("chatMembers").withIndex("by_userId_and_active", q => q.eq("userId", user._id).eq("active", true)).order("desc").paginate(boundedPage(args.paginationOpts));
  const page = await Promise.all(result.page.map(async member => {
    const conversation = await ctx.db.get(member.conversationId);
    if (!conversation) throw new Error("Conversation is unavailable.");
    let peer = null;
    if (conversation.type === "direct") {
      const members = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_active", q => q.eq("conversationId", conversation._id).eq("active", true)).take(2);
      const other = members.find(row => row.userId !== user._id);
      if (other) peer = await publicUser(ctx, other.userId);
    }
    return { _id: conversation._id, type: conversation.type, name: peer?.name || conversation.name, description: conversation.description, official: conversation.official, archived: conversation.archived, updatedAt: conversation.updatedAt, lastMessage: conversation.lastMessage, lastSenderId: conversation.lastSenderId, lastSeq: conversation.lastSeq, unread: unread(conversation, member), peer };
  }));
  return { ...result, page };
} });
export const directory = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireUser(ctx);
  const result = await ctx.db.query("users").withIndex("by_archivedAt", q => q.eq("archivedAt", undefined)).paginate(boundedPage(args.paginationOpts));
  return { ...result, page: await Promise.all(result.page.map(user => publicUser(ctx, user._id))) };
} });
export const direct = mutation({ args: { recipientId: v.id("users") }, handler: async (ctx, args) => {
  const { user } = await requireUser(ctx);
  if (user._id === args.recipientId) throw new ConvexError("Choose another account to start a conversation.");
  const recipient = await ctx.db.get(args.recipientId);
  if (!recipient || recipient.archivedAt !== undefined) throw new ConvexError("This account is no longer available.");
  const directKey = [user._id, recipient._id].sort().join(":");
  const existing = await ctx.db.query("chatConversations").withIndex("by_directKey", q => q.eq("directKey", directKey)).unique();
  if (existing) return existing._id;
  await limit(ctx, `${user._id}:direct`, 20, 60000);
  const id = await ctx.db.insert("chatConversations", { type: "direct", directKey, name: "Direct conversation", description: "", createdBy: user._id, createdAt: Date.now(), updatedAt: Date.now(), official: false, autoJoin: false, archived: false, lastSeq: 0, memberCount: 0 });
  const conversation = (await ctx.db.get(id))!;
  await addMember(ctx, conversation, user._id);
  await addMember(ctx, conversation, recipient._id);
  return id;
} });
export const details = query({ args: { conversationId: v.id("chatConversations") }, handler: async (ctx, args) => {
  const { conversation, user, member } = await requireMember(ctx, args.conversationId);
  let peerReadSeq: number | null = null;
  let peer = null;
  if (conversation.type === "direct") {
    const rows = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_active", q => q.eq("conversationId", conversation._id).eq("active", true)).take(2);
    const other = rows.find(row => row.userId !== user._id);
    if (other) { peerReadSeq = other.lastReadSeq; peer = await publicUser(ctx, other.userId); }
  }
  return { ...conversation, name: peer?.name || conversation.name, peer, peerReadSeq, unread: unread(conversation, member) };
} });

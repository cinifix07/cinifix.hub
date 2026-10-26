import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { boundedPage, publicUser, requireMember } from "./shared";
import { limit } from "./limits";

export const list = query({ args: { conversationId: v.id("chatConversations"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireMember(ctx, args.conversationId);
  const result = await ctx.db.query("chatMessages").withIndex("by_conversationId_and_seq", q => q.eq("conversationId", args.conversationId)).order("desc").paginate(boundedPage(args.paginationOpts));
  const senders = new Map<Id<"users">, Awaited<ReturnType<typeof publicUser>>>();
  for (const row of result.page) if (!senders.has(row.senderId)) senders.set(row.senderId, await publicUser(ctx, row.senderId));
  return { ...result, page: result.page.map(row => ({ ...row, sender: senders.get(row.senderId)! })) };
} });
export const send = mutation({ args: { conversationId: v.id("chatConversations"), body: v.string(), clientId: v.string() }, handler: async (ctx, args) => {
  const { user, member, conversation } = await requireMember(ctx, args.conversationId);
  const existing = await ctx.db.query("chatMessages").withIndex("by_conversationId_and_senderId_and_clientId", q => q.eq("conversationId", conversation._id).eq("senderId", user._id).eq("clientId", args.clientId)).unique();
  if (existing) return existing._id;
  if (conversation.archived) throw new ConvexError("This group is archived. Its message history is read-only.");
  if (!args.body.trim()) throw new ConvexError("Write a message before sending.");
  if (args.body.length > 10000 || new TextEncoder().encode(args.body).length > 40000) throw new ConvexError("Messages can contain up to 10,000 characters (40 KB).");
  if (args.clientId.length < 8 || args.clientId.length > 100) throw new ConvexError("Invalid message identifier.");
  if (conversation.type === "direct") {
    const peers = await ctx.db.query("chatMembers").withIndex("by_conversationId_and_active", q => q.eq("conversationId", conversation._id).eq("active", true)).take(2);
    for (const peer of peers) { const account = await ctx.db.get(peer.userId); if (!account || account.archivedAt !== undefined) throw new ConvexError("This account is archived. Message history is still available."); }
  }
  await limit(ctx, `${user._id}:send`, 10, 10000);
  const seq = conversation.lastSeq + 1;
  const senderSeq = member.sentCount + 1;
  const id = await ctx.db.insert("chatMessages", { conversationId: conversation._id, senderId: user._id, body: args.body, clientId: args.clientId, seq, senderSeq, createdAt: Date.now() });
  await ctx.db.patch(conversation._id, { lastSeq: seq, updatedAt: Date.now(), lastMessage: args.body.slice(0, 180), lastSenderId: user._id });
  await ctx.db.patch(member._id, { sentCount: senderSeq });
  return id;
} });
export const read = mutation({ args: { conversationId: v.id("chatConversations"), throughSeq: v.number() }, handler: async (ctx, args) => {
  const { user, member, conversation } = await requireMember(ctx, args.conversationId);
  if (!Number.isInteger(args.throughSeq) || args.throughSeq < 0 || args.throughSeq > conversation.lastSeq) throw new ConvexError("Invalid read position.");
  if (args.throughSeq <= member.lastReadSeq) return;
  const lastOwn = await ctx.db.query("chatMessages").withIndex("by_conversationId_and_senderId_and_seq", q => q.eq("conversationId", conversation._id).eq("senderId", user._id).lte("seq", args.throughSeq)).order("desc").first();
  await ctx.db.patch(member._id, { lastReadSeq: args.throughSeq, readSentCount: lastOwn?.senderSeq ?? 0, lastReadAt: Date.now() });
} });

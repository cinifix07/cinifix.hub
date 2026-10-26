import { ConvexError, v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../authHelpers";
import { limit } from "./limits";

export const heartbeat = mutation({ args: { tabId: v.string() }, handler: async (ctx, args) => {
  const { user, session } = await requireUser(ctx);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(args.tabId)) throw new ConvexError("Invalid browser tab.");
  await limit(ctx, `${user._id}:presence`, 120, 60000);
  const row = await ctx.db.query("chatPresence").withIndex("by_sessionId_and_tabId", q => q.eq("sessionId", session._id).eq("tabId", args.tabId)).unique();
  const expiresAt = Date.now() + 90000;
  const value = { userId: user._id, sessionId: session._id, tabId: args.tabId, lastSeen: Date.now(), expiresAt };
  const id = row ? (await ctx.db.patch(row._id, value), row._id) : await ctx.db.insert("chatPresence", value);
  await ctx.scheduler.runAfter(90000, internal.chat.presence.expire, { id, expiresAt });
} });
export const disconnect = mutation({ args: { tabId: v.string() }, handler: async (ctx, args) => {
  const { session } = await requireUser(ctx);
  const row = await ctx.db.query("chatPresence").withIndex("by_sessionId_and_tabId", q => q.eq("sessionId", session._id).eq("tabId", args.tabId)).unique();
  if (row) await ctx.db.patch(row._id, { expiresAt: 0 });
} });
export const expire = internalMutation({ args: { id: v.id("chatPresence"), expiresAt: v.number() }, handler: async (ctx, args) => {
  const row = await ctx.db.get(args.id);
  if (row && row.expiresAt === args.expiresAt && row.expiresAt <= Date.now()) await ctx.db.patch(row._id, { expiresAt: 0 });
} });

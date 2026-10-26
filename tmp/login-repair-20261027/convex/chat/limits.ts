import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";

export async function limit(ctx: MutationCtx, key: string, maximum: number, windowMs: number) {
  const record = await ctx.db.query("chatRateLimits").withIndex("by_key", q => q.eq("key", key)).unique();
  const now = Date.now();
  if (!record) { await ctx.db.insert("chatRateLimits", { key, startedAt: now, count: 1 }); return; }
  if (now - record.startedAt >= windowMs) { await ctx.db.patch(record._id, { startedAt: now, count: 1 }); return; }
  if (record.count >= maximum) throw new ConvexError("Too many requests. Please wait a moment and try again.");
  await ctx.db.patch(record._id, { count: record.count + 1 });
}
// Secret-key-only sign-in has no account identifier before validation. This
// global ceiling bounds expensive verification work without trusting a fake IP.
export const loginAttempt = internalMutation({ args: { key: v.literal("login") }, handler: async (ctx) => { await limit(ctx, "login", 30, 60000); } });

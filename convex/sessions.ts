import { v } from "convex/values";
import { query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, sessionUser, userRole } from "./authHelpers";

export const me = query({ args: {}, handler: async (ctx) => {
  const auth = await sessionUser(ctx);
  return auth ? { _id: auth.user._id, name: auth.user.name, role: userRole(auth.user) } : null;
} });
export const admin = internalQuery({ args: {}, handler: async (ctx) => { await requireAdmin(ctx); return true; } });
export const issue = internalMutation({
  args: { userId: v.id("users"), refreshHash: v.string(), issuer: v.string(), expectedVersion: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.archivedAt !== undefined || (user.authVersion ?? 0) !== args.expectedVersion) throw new Error("Account is no longer available. Please sign in again.");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const sessionId = await ctx.db.insert("authSessions", { userId: user._id, issuer: args.issuer, refreshHash: args.refreshHash, authVersion: args.expectedVersion, expiresAt });
    await ctx.scheduler.runAt(expiresAt, internal.sessions.expire, { sessionId });
    return { sessionId, userId: user._id, expiresAt, name: user.name, role: userRole(user) };
  },
});
export const lookup = internalQuery({ args: { refreshHash: v.string() }, handler: async (ctx, args) => {
  const session = await ctx.db.query("authSessions").withIndex("by_refreshHash", q => q.eq("refreshHash", args.refreshHash)).unique();
  if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || user.archivedAt !== undefined || (user.authVersion ?? 0) !== session.authVersion) return null;
  return { sessionId: session._id, userId: user._id, issuer: session.issuer, expiresAt: session.expiresAt, name: user.name, role: userRole(user) };
} });
export const revoke = internalMutation({ args: { refreshHash: v.string() }, handler: async (ctx, args) => {
  const session = await ctx.db.query("authSessions").withIndex("by_refreshHash", q => q.eq("refreshHash", args.refreshHash)).unique();
  if (session && !session.revokedAt) await ctx.db.patch(session._id, { revokedAt: Date.now() });
  return null;
} });
export const expire = internalMutation({ args: { sessionId: v.id("authSessions") }, handler: async (ctx, args) => {
  const session = await ctx.db.get(args.sessionId);
  if (session && session.expiresAt <= Date.now() && !session.revokedAt) await ctx.db.patch(session._id, { revokedAt: Date.now() });
} });

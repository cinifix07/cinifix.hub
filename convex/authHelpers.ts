import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export function userRole(user: { role?: "admin" | "user"; normalizedName: string }) {
  return user.role ?? (user.normalizedName === "cinifix" ? "admin" : "user");
}

export async function sessionUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || typeof identity.sessionId !== "string") return null;
  const id = ctx.db.normalizeId("authSessions", identity.sessionId);
  if (!id) return null;
  const session = await ctx.db.get(id);
  if (!session || session.revokedAt || session.expiresAt <= Date.now() || session.issuer !== identity.issuer || identity.subject !== session.userId) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || user.archivedAt !== undefined || (user.authVersion ?? 0) !== session.authVersion) return null;
  // Subject is checked together with the configured issuer and signed session.
  return { user, session, identity };
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const auth = await sessionUser(ctx);
  if (!auth) throw new ConvexError("Your session expired. Please sign in again.");
  return auth;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const auth = await requireUser(ctx);
  if (userRole(auth.user) !== "admin") throw new ConvexError("Administrator access is required.");
  return auth;
}

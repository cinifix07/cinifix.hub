"use node";
import { createHash, randomBytes } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import { v } from "convex/values";
import { action, env } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export type LoginSession = { ok: true; userId: Id<"users">; name: string; role: "admin" | "user"; refreshToken: string; token: string; expiresAt: number };
async function signingKey() {
  if (!env.CINIFIX_AUTH_PRIVATE_KEY || !env.CINIFIX_AUTH_ISSUER || !env.CINIFIX_AUTH_PUBLIC_JWK) throw new Error("Secure sign-in setup is not ready. Please contact CINIFIX TECH.");
  return await importPKCS8(env.CINIFIX_AUTH_PRIVATE_KEY.replace(/\\n/g, "\n"), "RS256");
}
async function sign(session: { sessionId: Id<"authSessions">; userId: Id<"users">; expiresAt: number }, key: Awaited<ReturnType<typeof signingKey>>) {
  const expiresAt = Math.min(Date.now() + 15 * 60 * 1000, session.expiresAt);
  const token = await new SignJWT({ sessionId: session.sessionId })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "cinifix-session-v1" })
    .setIssuer(env.CINIFIX_AUTH_ISSUER!).setAudience("cinifix").setSubject(session.userId)
    .setIssuedAt().setExpirationTime(Math.floor(expiresAt / 1000)).sign(key);
  return { token, expiresAt };
}
export async function issueLoginSession(ctx: ActionCtx, user: { _id: Id<"users">; authVersion?: number }): Promise<LoginSession> {
  const key = await signingKey();
  const refreshToken = randomBytes(32).toString("base64url");
  const session = await ctx.runMutation(internal.sessions.issue, { userId: user._id, refreshHash: hash(refreshToken), issuer: env.CINIFIX_AUTH_ISSUER!, expectedVersion: user.authVersion ?? 0 });
  return { ok: true, userId: user._id, name: session.name, role: session.role, refreshToken, ...await sign(session, key) };
}
export const refresh = action({ args: { refreshToken: v.string() }, handler: async (ctx, args) => {
  if (args.refreshToken.length !== 43) return { ok: false as const };
  const session = await ctx.runQuery(internal.sessions.lookup, { refreshHash: hash(args.refreshToken) });
  if (!session || session.issuer !== env.CINIFIX_AUTH_ISSUER) return { ok: false as const };
  return { ok: true as const, ...await sign(session, await signingKey()) };
} });
export const logout = action({ args: { refreshToken: v.string() }, handler: async (ctx, args) => {
  await ctx.runMutation(internal.sessions.revoke, { refreshHash: hash(args.refreshToken) });
  return null;
} });

"use node";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { issueLoginSession } from "./sessionActions";
import type { LoginSession } from "./sessionActions";
import type { Doc } from "./_generated/dataModel";

const PASSWORD_KEY_LENGTH = 64;
type UserRole = "admin" | "user";

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
}

function requireValidPassword(password: string) {
  if (password.length < 6) {
    throw new Error("Secret key must be at least 6 characters.");
  }
}

function normalizeRole(role: UserRole | undefined): UserRole {
  return role === "admin" ? "admin" : "user";
}

export const createUser = action({
  args: {
    name: v.string(),
    password: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.sessions.admin, {});
    const name = args.name.trim();
    const normalizedName = normalizeName(name);

    if (normalizedName.length === 0) {
      throw new Error("Name is required.");
    }

    requireValidPassword(args.password);

    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(args.password, passwordSalt);

    return await ctx.runMutation(internal.users.create, {
      name,
      normalizedName,
      role: normalizeRole(args.role),
      passwordHash,
      passwordSalt,
    });
  },
});

export const updateUser = action({
  args: {
    userId: v.id("users"),
    name: v.string(),
    password: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.sessions.admin, {});
    const name = args.name.trim();
    const normalizedName = normalizeName(name);

    if (normalizedName.length === 0) {
      throw new Error("Name is required.");
    }

    if (args.password !== undefined && args.password.length > 0) {
      requireValidPassword(args.password);

      const passwordSalt = randomBytes(16).toString("hex");
      const passwordHash = hashPassword(args.password, passwordSalt);

      return await ctx.runMutation(internal.users.update, {
        userId: args.userId,
        name,
        normalizedName,
        role: normalizeRole(args.role),
        passwordHash,
        passwordSalt,
      });
    }

    return await ctx.runMutation(internal.users.update, {
      userId: args.userId,
      name,
      normalizedName,
      role: normalizeRole(args.role),
    });
  },
});

export const verifyUser = action({
  args: {
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.chat.limits.loginAttempt, { key: "login" });
    const normalizedName = normalizeName(args.name);

    if (normalizedName.length === 0 || args.password.length > 1024) {
      return false;
    }

    const user = await ctx.runQuery(internal.users.getByNormalizedName, {
      normalizedName,
    });

    if (user === null || user.archivedAt !== undefined) {
      return false;
    }

    const expectedHash = Buffer.from(user.passwordHash, "hex");
    const suppliedHash = Buffer.from(
      hashPassword(args.password, user.passwordSalt),
      "hex",
    );

    if (expectedHash.length !== suppliedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, suppliedHash);
  },
});

export const verifySecretKey = action({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args): Promise<LoginSession | { ok: false; name: null; role: null }> => {
    if (args.password.length === 0 || args.password.length > 1024) {
      return { ok: false, name: null, role: null };
    }

    await ctx.runMutation(internal.chat.limits.loginAttempt, { key: "login" });
    let cursor: string | null = null;
    let match: Pick<Doc<"users">, "_id" | "authVersion" | "name" | "passwordHash" | "passwordSalt"> | null = null;
    do {
      const result = await ctx.runQuery(internal.users.listForSecretKeyCheck, { paginationOpts: { cursor, numItems: 50 } });
      for (const user of result.page) {
        const expectedHash = Buffer.from(user.passwordHash, "hex");
        const suppliedHash = Buffer.from(
          hashPassword(args.password, user.passwordSalt),
          "hex",
        );

        if (
          expectedHash.length === suppliedHash.length &&
          timingSafeEqual(expectedHash, suppliedHash)
        ) {
          if (match) throw new Error("This secret key matches multiple accounts. Contact CINIFIX TECH for a unique key.");
          match = user;
        }
      }
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);

    if (match) return await issueLoginSession(ctx, match);

    return { ok: false, name: null, role: null };
  },
});

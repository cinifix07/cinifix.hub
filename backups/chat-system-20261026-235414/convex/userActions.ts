"use node";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

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
    const normalizedName = normalizeName(args.name);

    if (normalizedName.length === 0) {
      return false;
    }

    const user = await ctx.runQuery(internal.users.getByNormalizedName, {
      normalizedName,
    });

    if (user === null) {
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
  handler: async (ctx, args) => {
    if (args.password.length === 0) {
      return { ok: false, name: null, role: null };
    }

    const users = await ctx.runQuery(internal.users.listForSecretKeyCheck, {
      limit: 100,
    });

    for (const user of users) {
      const expectedHash = Buffer.from(user.passwordHash, "hex");
      const suppliedHash = Buffer.from(
        hashPassword(args.password, user.passwordSalt),
        "hex",
      );

      if (
        expectedHash.length === suppliedHash.length &&
        timingSafeEqual(expectedHash, suppliedHash)
      ) {
        return { ok: true, name: user.name, role: user.role };
      }
    }

    return { ok: false, name: null, role: null };
  },
});

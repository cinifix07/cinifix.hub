import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { requireAdmin, userRole } from "./authHelpers";
import { checkAdminGroupExit } from "./chat/shared";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

type UserRole = "admin" | "user";

function getUserRole(role: UserRole | undefined, normalizedName: string): UserRole {
  if (role === "admin" || role === "user") {
    return role;
  }

  return normalizedName === "cinifix" ? "admin" : "user";
}

export const create = internalMutation({
  args: {
    name: v.string(),
    normalizedName: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.string(),
    passwordSalt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", args.normalizedName),
      )
      .unique();

    if (existingUser !== null) {
      throw new Error("A user with this name already exists.");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      normalizedName: args.normalizedName,
      role: getUserRole(args.role, args.normalizedName),
      passwordHash: args.passwordHash,
      passwordSalt: args.passwordSalt,
    });
    await ctx.scheduler.runAfter(0, internal.chat.groups.enrollFuture, { userId, cursor: null });
    return userId;
  },
});

export const getByNormalizedName = internalQuery({
  args: {
    normalizedName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", args.normalizedName),
      )
      .unique();
  },
});

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit, 1), 100);
    const users = await ctx.db.query("users").withIndex("by_archivedAt", q => q.eq("archivedAt", undefined)).order("desc").take(limit);

    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      normalizedName: user.normalizedName,
      role: getUserRole(user.role, user.normalizedName),
    }));
  },
});

export const update = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    normalizedName: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target || target.archivedAt !== undefined) throw new Error("User not found.");
    if (userRole(target) === "admin" && getUserRole(args.role, args.normalizedName) !== "admin") await checkAdminGroupExit(ctx, target._id);
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", args.normalizedName),
      )
      .unique();

    if (existingUser !== null && existingUser._id !== args.userId) {
      throw new Error("A user with this name already exists.");
    }

    const update = {
      name: args.name,
      normalizedName: args.normalizedName,
      role: getUserRole(args.role, args.normalizedName),
      authVersion: (target.authVersion ?? 0) + 1,
    };

    if (args.passwordHash !== undefined && args.passwordSalt !== undefined) {
      await ctx.db.patch(args.userId, {
        ...update,
        passwordHash: args.passwordHash,
        passwordSalt: args.passwordSalt,
      });

      return args.userId;
    }

    await ctx.db.patch(args.userId, update);

    return args.userId;
  },
});

export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);

    if (user === null || user.archivedAt !== undefined) {
      throw new Error("User not found.");
    }
    if (userRole(user) === "admin") await checkAdminGroupExit(ctx, user._id);

    await ctx.db.insert("archivedUsers", {
      originalUserId: user._id,
      name: user.name,
      normalizedName: user.normalizedName,
      role: getUserRole(user.role, user.normalizedName),
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      archivedAt: Date.now(),
    });

    await ctx.db.patch(args.userId, { archivedAt: Date.now(), authVersion: (user.authVersion ?? 0) + 1 });

    return args.userId;
  },
});

export const listForSecretKeyCheck = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").withIndex("by_archivedAt", q => q.eq("archivedAt", undefined)).paginate(args.paginationOpts);

    return { ...users, page: users.page.map((user) => ({
      _id: user._id,
      authVersion: user.authVersion,
      name: user.name,
      role: getUserRole(user.role, user.normalizedName),
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
    })) };
  },
});

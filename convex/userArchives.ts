import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type UserRole = "admin" | "user";

function getUserRole(role: UserRole | undefined, normalizedName: string): UserRole {
  if (role === "admin" || role === "user") {
    return role;
  }

  return normalizedName === "cinifix" ? "admin" : "user";
}

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 100);
    const archivedUsers = await ctx.db
      .query("archivedUsers")
      .order("desc")
      .take(limit);

    return archivedUsers.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      originalUserId: user.originalUserId,
      name: user.name,
      normalizedName: user.normalizedName,
      role: getUserRole(user.role, user.normalizedName),
      archivedAt: user.archivedAt,
    }));
  },
});

export const restore = mutation({
  args: {
    archivedUserId: v.id("archivedUsers"),
  },
  handler: async (ctx, args) => {
    const archivedUser = await ctx.db.get(args.archivedUserId);

    if (archivedUser === null) {
      throw new Error("Archived user not found.");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", archivedUser.normalizedName),
      )
      .unique();

    if (existingUser !== null) {
      throw new Error("A user with this name already exists.");
    }

    const userId = await ctx.db.insert("users", {
      name: archivedUser.name,
      normalizedName: archivedUser.normalizedName,
      role: getUserRole(archivedUser.role, archivedUser.normalizedName),
      passwordHash: archivedUser.passwordHash,
      passwordSalt: archivedUser.passwordSalt,
    });

    await ctx.db.delete(args.archivedUserId);

    return userId;
  },
});

export const remove = mutation({
  args: {
    archivedUserId: v.id("archivedUsers"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.archivedUserId);

    return args.archivedUserId;
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db.query("userLogs").order("desc").take(limit);
  },
});

export const listByUser = query({
  args: {
    userName: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const userName = args.userName.trim() || "CINIFIX";
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db
      .query("userLogs")
      .withIndex("by_userName_and_createdAt", (q) => q.eq("userName", userName))
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    userName: v.string(),
    action: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const userName = args.userName.trim() || "CINIFIX";
    const action = args.action.trim();
    const details = args.details.trim();

    if (action.length === 0) {
      throw new Error("Action is required.");
    }

    return await ctx.db.insert("userLogs", {
      userName,
      action,
      details,
      createdAt: Date.now(),
    });
  },
});

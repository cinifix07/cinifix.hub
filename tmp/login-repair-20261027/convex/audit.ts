import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeAuditInput(args: {
  sourceName: string;
  totalAmount: number;
  createdBy: string;
}) {
  const sourceName = args.sourceName.trim();
  const createdBy = args.createdBy.trim();

  if (sourceName.length === 0) {
    throw new Error("Name is required.");
  }

  if (!Number.isFinite(args.totalAmount) || args.totalAmount <= 0) {
    throw new Error("Total amount must be greater than 0.");
  }

  return {
    sourceName,
    totalAmount: args.totalAmount,
    createdBy: createdBy || "CINIFIX",
  };
}

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db.query("audit").order("desc").take(limit);
  },
});

export const listByUser = query({
  args: {
    createdBy: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const createdBy = args.createdBy.trim() || "CINIFIX";
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db
      .query("audit")
      .withIndex("by_createdBy_and_createdAt", (q) =>
        q.eq("createdBy", createdBy),
      )
      .order("desc")
      .take(limit);
  },
});

export const createInflow = mutation({
  args: {
    moneyFrom: v.string(),
    totalAmount: v.number(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const record = normalizeAuditInput({
      sourceName: args.moneyFrom,
      totalAmount: args.totalAmount,
      createdBy: args.createdBy,
    });

    return await ctx.db.insert("audit", {
      type: "inflow",
      ...record,
      createdAt: Date.now(),
    });
  },
});

export const createOutflow = mutation({
  args: {
    expenseName: v.string(),
    totalAmount: v.number(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const record = normalizeAuditInput({
      sourceName: args.expenseName,
      totalAmount: args.totalAmount,
      createdBy: args.createdBy,
    });

    return await ctx.db.insert("audit", {
      type: "outflow",
      ...record,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    auditId: v.id("audit"),
    type: v.union(v.literal("inflow"), v.literal("outflow")),
    sourceName: v.string(),
    totalAmount: v.number(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const record = normalizeAuditInput({
      sourceName: args.sourceName,
      totalAmount: args.totalAmount,
      createdBy: args.createdBy,
    });

    await ctx.db.patch(args.auditId, {
      type: args.type,
      ...record,
    });
  },
});

export const remove = mutation({
  args: {
    auditId: v.id("audit"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.auditId);
  },
});

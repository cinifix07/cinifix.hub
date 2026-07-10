import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeNarrativeInput(args: {
  reportDate: string;
  narrative: string;
  createdBy: string;
  taskCount: number;
}) {
  const reportDate = args.reportDate.trim();
  const narrative = args.narrative.trim();
  const createdBy = args.createdBy.trim();

  if (reportDate.length === 0) {
    throw new Error("Report date is required.");
  }

  if (narrative.length === 0) {
    throw new Error("Narrative report is required.");
  }

  if (!Number.isFinite(args.taskCount) || args.taskCount < 1) {
    throw new Error("Task count must be greater than 0.");
  }

  return {
    reportDate,
    narrative,
    createdBy: createdBy || "CINIFIX",
    taskCount: args.taskCount,
  };
}

export const getByDate = query({
  args: {
    reportDate: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("narratives")
      .withIndex("by_reportDate_and_createdBy", (q) =>
        q.eq("reportDate", args.reportDate.trim()).eq("createdBy", args.createdBy.trim() || "CINIFIX"),
      )
      .unique();
  },
});

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db.query("narratives").order("desc").take(limit);
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
      .query("narratives")
      .withIndex("by_createdBy_and_createdAt", (q) =>
        q.eq("createdBy", createdBy),
      )
      .order("desc")
      .take(limit);
  },
});

export const save = mutation({
  args: {
    reportDate: v.string(),
    narrative: v.string(),
    createdBy: v.string(),
    taskCount: v.number(),
  },
  handler: async (ctx, args) => {
    const report = normalizeNarrativeInput(args);
    const existing = await ctx.db
      .query("narratives")
      .withIndex("by_reportDate_and_createdBy", (q) =>
        q.eq("reportDate", report.reportDate).eq("createdBy", report.createdBy),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        narrative: report.narrative,
        taskCount: report.taskCount,
        updatedAt: Date.now(),
      });

      return existing._id;
    }

    return await ctx.db.insert("narratives", {
      ...report,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    narrativeId: v.id("narratives"),
    reportDate: v.string(),
    narrative: v.string(),
    createdBy: v.string(),
    taskCount: v.number(),
  },
  handler: async (ctx, args) => {
    const report = normalizeNarrativeInput(args);

    await ctx.db.patch(args.narrativeId, {
      reportDate: report.reportDate,
      narrative: report.narrative,
      createdBy: report.createdBy,
      taskCount: report.taskCount,
      updatedAt: Date.now(),
    });

    return args.narrativeId;
  },
});

export const remove = mutation({
  args: {
    narrativeId: v.id("narratives"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.narrativeId);

    return args.narrativeId;
  },
});

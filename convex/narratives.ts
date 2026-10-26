import { paginationOptsValidator } from "convex/server";
import { resolveEvent } from "./events";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin, requireUser } from "./authHelpers";
import { reportPage, reportScope, requireReportOwner } from "./reportAccess";

function normalizeNarrativeInput(args: {
  reportDate: string;
  narrative: string;
  createdBy: string;
  taskCount: number;
}, allowZero = false) {
  const reportDate = args.reportDate.trim();
  const narrative = args.narrative;
  const createdBy = args.createdBy.trim();

  if (reportDate.length === 0) {
    throw new Error("Report date is required.");
  }

  if (narrative.trim().length === 0) {
    throw new Error("Narrative report is required.");
  }

  if (!Number.isInteger(args.taskCount) || args.taskCount < (allowZero ? 0 : 1)) {
    throw new Error(allowZero ? "Task count cannot be negative." : "Task count must be greater than 0.");
  }

  validateReportDate(reportDate);
  if (new TextEncoder().encode(narrative).length > 700000) throw new Error("Narrative exceeds the supported report size (700 KB). Please split it into separate reports.");

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
    const createdBy = reportScope(await requireUser(ctx), args.createdBy)!;
    return await ctx.db
      .query("narratives")
      .withIndex("by_reportDate_and_createdBy_and_reportType", (q) =>
        q.eq("reportDate", args.reportDate.trim()).eq("createdBy", createdBy).eq("reportType", undefined),
      )
      .unique();
  },
});

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const createdBy = reportScope(await requireUser(ctx));
    const limit = Math.min(Math.max(args.limit, 1), 100);

    const rows = createdBy === undefined ? ctx.db.query("narratives") : ctx.db.query("narratives").withIndex("by_createdBy_and_createdAt", q => q.eq("createdBy", createdBy));
    return await rows.order("desc").take(limit);
  },
});

export const listByUser = query({
  args: {
    createdBy: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const createdBy = reportScope(await requireUser(ctx), args.createdBy)!;
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
    const createdBy = reportScope(await requireUser(ctx), args.createdBy)!;
    const report = normalizeNarrativeInput({ ...args, createdBy });
    const existing = await ctx.db
      .query("narratives")
      .withIndex("by_reportDate_and_createdBy_and_reportType", (q) =>
        q.eq("reportDate", report.reportDate).eq("createdBy", report.createdBy).eq("reportType", undefined),
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
    title: v.optional(v.string()),
    eventId: v.optional(v.union(v.id("events"), v.null())),
    newEventName: v.optional(v.string()),
    reportDate: v.string(),
    narrative: v.string(),
    createdBy: v.string(),
    taskCount: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireUser(ctx);
    const existing = await ctx.db.get(args.narrativeId);
    if (!existing) throw new Error("Report no longer exists.");
    requireReportOwner(auth, existing.createdBy);
    const createdBy = reportScope(auth, args.createdBy)!;
    const report = normalizeNarrativeInput({ ...args, createdBy }, existing.reportType === "manual");
    const title = args.title === undefined ? existing.title : validateTitle(args.title);
    const eventId = args.eventId === undefined && args.newEventName === undefined ? existing.eventId : await resolveEvent(ctx, { ...args, createdBy: report.createdBy });
    const taskCount = existing.reportType === "manual" && report.reportDate !== existing.reportDate
      ? await countScheduledTasks(ctx, report.createdBy, report.reportDate)
      : report.taskCount;
    if (existing.reportType !== "manual") {
      const daily = await ctx.db.query("narratives").withIndex("by_reportDate_and_createdBy_and_reportType", q => q.eq("reportDate", report.reportDate).eq("createdBy", report.createdBy).eq("reportType", undefined)).unique();
      if (daily && daily._id !== args.narrativeId) throw new Error("A daily report already exists for this user and date.");
    }

    await ctx.db.patch(args.narrativeId, {
      title,
      eventId,
      reportDate: report.reportDate,
      narrative: report.narrative,
      createdBy: report.createdBy,
      taskCount,
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
    await requireAdmin(ctx);
    await ctx.db.delete(args.narrativeId);

    return args.narrativeId;
  },
});

function validateReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + "T00:00:00Z")) || new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value) throw new Error("Choose a valid report date.");
}

function validateTitle(value: string) {
  const title = value.trim();
  if (!title) throw new Error("Report title is required.");
  if (title.length > 200) throw new Error("Report title must be 200 characters or fewer.");
  return title;
}

export const listPage = query({
  args: { createdBy: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const createdBy = reportScope(await requireUser(ctx), args.createdBy);
    const rows = createdBy === undefined ? ctx.db.query("narratives") : ctx.db.query("narratives").withIndex("by_createdBy_and_createdAt", q => q.eq("createdBy", createdBy));
    return await rows.order("desc").paginate(reportPage(args.paginationOpts));
  },
});

export const createManual = mutation({
  args: { title: v.string(), reportDate: v.string(), narrative: v.string(), createdBy: v.string(), eventId: v.optional(v.id("events")), newEventName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const createdBy = reportScope(await requireUser(ctx), args.createdBy)!;
    const title = validateTitle(args.title);
    if (!args.createdBy.trim()) throw new Error("Report creator is required.");
    const report = normalizeNarrativeInput({ ...args, createdBy, taskCount: 0 }, true);
    const eventId = await resolveEvent(ctx, { ...args, createdBy: report.createdBy });
    const taskCount = await countScheduledTasks(ctx, report.createdBy, report.reportDate);
    return await ctx.db.insert("narratives", { ...report, title, eventId, taskCount, reportType: "manual", createdAt: Date.now() });
  },
});

async function countScheduledTasks(ctx: MutationCtx, createdBy: string, reportDate: string) {
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(reportDate + "T00:00:00Z").getUTCDay()];
  let count = 0;
  for await (const task of ctx.db.query("tasks").withIndex("by_createdBy", q => q.eq("createdBy", createdBy))) {
    const start = task.taskStartDate ?? task.taskDate;
    const end = task.taskEndDate ?? task.taskDate;
    if (start <= reportDate && reportDate <= end && (!task.taskWeekdays?.length || task.taskWeekdays.includes(weekday))) count++;
  }
  return count;
}

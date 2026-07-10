import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeTaskInput(args: {
  taskName: string;
  taskDate: string;
  taskStartTime: string;
  taskEndTime: string;
  taskDefinition: string;
}) {
  const taskName = args.taskName.trim();
  const taskDate = args.taskDate.trim();
  const taskStartTime = args.taskStartTime.trim();
  const taskEndTime = args.taskEndTime.trim();
  const taskDefinition = args.taskDefinition.trim();

  if (taskName.length === 0) {
    throw new Error("Task name is required.");
  }

  if (taskDate.length === 0) {
    throw new Error("Task date is required.");
  }

  if (taskStartTime.length === 0) {
    throw new Error("Start time is required.");
  }

  if (taskEndTime.length === 0) {
    throw new Error("End time is required.");
  }

  if (taskEndTime <= taskStartTime) {
    throw new Error("End time must be after start time.");
  }

  if (taskDefinition.length === 0) {
    throw new Error("Task definition is required.");
  }

  return {
    taskName,
    taskDate,
    taskStartTime,
    taskEndTime,
    taskTime: `${taskStartTime} - ${taskEndTime}`,
    taskDefinition,
  };
}

export const list = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), 100);

    return await ctx.db.query("tasks").order("desc").take(limit);
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
      .query("tasks")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", createdBy))
      .order("desc")
      .take(limit);
  },
});

export const listByDate = query({
  args: {
    taskDate: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const taskDate = args.taskDate.trim();
    const limit = Math.min(Math.max(args.limit, 1), 100);

    if (taskDate.length === 0) {
      return [];
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_taskDate_and_taskStartTime", (q) =>
        q.eq("taskDate", taskDate),
      )
      .order("desc")
      .take(limit);
  },
});

export const listByDateForUser = query({
  args: {
    taskDate: v.string(),
    createdBy: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const taskDate = args.taskDate.trim();
    const createdBy = args.createdBy.trim() || "CINIFIX";
    const limit = Math.min(Math.max(args.limit, 1), 100);

    if (taskDate.length === 0) {
      return [];
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_createdBy_and_taskDate_and_taskStartTime", (q) =>
        q.eq("createdBy", createdBy).eq("taskDate", taskDate),
      )
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    taskName: v.string(),
    taskDate: v.string(),
    taskStartTime: v.string(),
    taskEndTime: v.string(),
    taskDefinition: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const task = normalizeTaskInput(args);
    const createdBy = args.createdBy.trim();

    return await ctx.db.insert("tasks", {
      ...task,
      createdBy: createdBy || "CINIFIX",
      status: "pending",
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    taskName: v.string(),
    taskDate: v.string(),
    taskStartTime: v.string(),
    taskEndTime: v.string(),
    taskDefinition: v.string(),
  },
  handler: async (ctx, args) => {
    const task = normalizeTaskInput(args);

    await ctx.db.patch(args.taskId, task);
  },
});

export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

export const complete = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

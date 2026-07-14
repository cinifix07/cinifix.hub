import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function normalizeTaskInput(args: {
  taskName: string;
  taskStartDate: string;
  taskEndDate: string;
  taskWeekdays: string[];
  taskStartTime: string;
  taskEndTime: string;
  taskDefinition: string;
}) {
  const taskName = args.taskName.trim();
  const taskStartDate = args.taskStartDate.trim();
  const taskEndDate = args.taskEndDate.trim();
  const taskWeekdays = Array.from(new Set(args.taskWeekdays.map((day) => day.trim())));
  const taskStartTime = args.taskStartTime.trim();
  const taskEndTime = args.taskEndTime.trim();
  const taskDefinition = args.taskDefinition.trim();

  if (taskName.length === 0) {
    throw new Error("Task name is required.");
  }

  if (taskStartDate.length === 0) {
    throw new Error("Start date is required.");
  }

  if (taskEndDate.length === 0) {
    throw new Error("End date is required.");
  }

  if (taskStartTime.length === 0) {
    throw new Error("Start time is required.");
  }

  if (taskEndTime.length === 0) {
    throw new Error("End time is required.");
  }

  if (`${taskEndDate}T${taskEndTime}` <= `${taskStartDate}T${taskStartTime}`) {
    throw new Error("End date and time must be after start date and time.");
  }

  if (taskWeekdays.length === 0) {
    throw new Error("Select at least one schedule day.");
  }

  if (taskWeekdays.some((day) => !["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day))) {
    throw new Error("Schedule day is invalid.");
  }

  if (taskDefinition.length === 0) {
    throw new Error("Task definition is required.");
  }

  return {
    taskName,
    taskDate: taskStartDate,
    taskStartDate,
    taskEndDate,
    taskWeekdays,
    taskStartTime,
    taskEndTime,
    taskTime: `${taskStartTime} - ${taskEndTime}`,
    taskDefinition,
  };
}

function getTaskStartDate(task: {
  taskDate: string;
  taskStartDate?: string;
}) {
  return task.taskStartDate ?? task.taskDate;
}

function getTaskEndDate(task: {
  taskDate: string;
  taskEndDate?: string;
}) {
  return task.taskEndDate ?? task.taskDate;
}

function getDateValue(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getWeekdayValue(dateValue: string) {
  const weekdayIndex = new Date(`${dateValue}T00:00:00Z`).getUTCDay();
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdays[weekdayIndex];
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
    const readLimit = Math.max(limit, 100);

    if (taskDate.length === 0) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", createdBy))
      .order("desc")
      .take(readLimit);

    const activeTasks = tasks.filter((task) => {
      const startDate = getTaskStartDate(task);
      const endDate = getTaskEndDate(task);
      const taskWeekdays = task.taskWeekdays ?? [];
      const isSelectedWeekday =
        taskWeekdays.length === 0 || taskWeekdays.includes(getWeekdayValue(taskDate));

      return startDate <= taskDate && taskDate <= endDate && isSelectedWeekday;
    });

    const completedByTaskId = new Map();

    for (const task of activeTasks) {
      const completion = await ctx.db
        .query("taskCompletions")
        .withIndex("by_taskId_and_taskDate", (q) =>
          q.eq("taskId", task._id).eq("taskDate", taskDate),
        )
        .unique();

      if (completion) {
        completedByTaskId.set(task._id, completion.completedAt);
      }
    }

    return activeTasks.map((task) => {
      const wasCompletedBeforeDailyTracking =
        task.status === "completed" &&
        task.completedAt !== undefined &&
        getDateValue(task.completedAt) === taskDate;
      const isCompleted =
        completedByTaskId.has(task._id) || wasCompletedBeforeDailyTracking;

      return {
        ...task,
        status: isCompleted ? "completed" : "pending",
        completedAt: isCompleted
          ? (completedByTaskId.get(task._id) ?? task.completedAt)
          : null,
      };
    });
  },
});

export const create = mutation({
  args: {
    taskName: v.string(),
    taskStartDate: v.string(),
    taskEndDate: v.string(),
    taskWeekdays: v.array(v.string()),
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
    taskStartDate: v.string(),
    taskEndDate: v.string(),
    taskWeekdays: v.array(v.string()),
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
    taskDate: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const taskDate = args.taskDate.trim();
    const createdBy = args.createdBy.trim() || "CINIFIX";

    if (taskDate.length === 0) {
      throw new Error("Task date is required.");
    }

    const existing = await ctx.db
      .query("taskCompletions")
      .withIndex("by_taskId_and_taskDate", (q) =>
        q.eq("taskId", args.taskId).eq("taskDate", taskDate),
      )
      .unique();
    const completedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { completedAt, createdBy });
      return;
    }

    await ctx.db.insert("taskCompletions", {
      taskId: args.taskId,
      taskDate,
      createdBy,
      completedAt,
    });
  },
});

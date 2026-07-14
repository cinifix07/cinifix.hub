import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.string(),
    passwordSalt: v.string(),
  }).index("by_normalizedName", ["normalizedName"]),
  archivedUsers: defineTable({
    originalUserId: v.id("users"),
    name: v.string(),
    normalizedName: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    archivedAt: v.number(),
  }).index("by_normalizedName", ["normalizedName"]),
  userLogs: defineTable({
    userName: v.string(),
    action: v.string(),
    details: v.string(),
    createdAt: v.number(),
  }).index("by_userName_and_createdAt", ["userName", "createdAt"]),
  tasks: defineTable({
    taskName: v.string(),
    taskDate: v.string(),
    taskStartDate: v.optional(v.string()),
    taskEndDate: v.optional(v.string()),
    taskWeekdays: v.optional(v.array(v.string())),
    taskTime: v.optional(v.string()),
    taskStartTime: v.optional(v.string()),
    taskEndTime: v.optional(v.string()),
    taskDefinition: v.string(),
    createdBy: v.string(),
    status: v.string(),
    completedAt: v.optional(v.number()),
  })
    .index("by_taskDate_and_taskTime", ["taskDate", "taskTime"])
    .index("by_taskDate_and_taskStartTime", ["taskDate", "taskStartTime"])
    .index("by_createdBy", ["createdBy"])
    .index("by_createdBy_and_taskDate_and_taskStartTime", ["createdBy", "taskDate", "taskStartTime"]),
  taskCompletions: defineTable({
    taskId: v.id("tasks"),
    taskDate: v.string(),
    createdBy: v.optional(v.string()),
    completedAt: v.number(),
  })
    .index("by_taskId_and_taskDate", ["taskId", "taskDate"])
    .index("by_createdBy_and_taskDate", ["createdBy", "taskDate"]),
  audit: defineTable({
    type: v.string(),
    sourceName: v.string(),
    totalAmount: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_type_and_createdAt", ["type", "createdAt"])
    .index("by_createdBy_and_createdAt", ["createdBy", "createdAt"]),
  narratives: defineTable({
    reportDate: v.string(),
    narrative: v.string(),
    createdBy: v.string(),
    taskCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_reportDate_and_createdBy", ["reportDate", "createdBy"])
    .index("by_createdBy_and_createdAt", ["createdBy", "createdAt"]),
});

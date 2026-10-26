import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    archivedAt: v.optional(v.number()),
    authVersion: v.optional(v.number()),
  }).index("by_normalizedName", ["normalizedName"]).index("by_archivedAt", ["archivedAt"]),
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
    title: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    reportType: v.optional(v.literal("manual")),
    reportDate: v.string(),
    narrative: v.string(),
    createdBy: v.string(),
    taskCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_reportDate_and_createdBy", ["reportDate", "createdBy"])
    .index("by_reportDate_and_createdBy_and_reportType", ["reportDate", "createdBy", "reportType"])
    .index("by_createdBy_and_createdAt", ["createdBy", "createdAt"]),
  events: defineTable({
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_createdBy_and_createdAt", ["createdBy", "createdAt"]),
  authSessions: defineTable({
    userId: v.id("users"), issuer: v.string(), refreshHash: v.string(),
    authVersion: v.number(), expiresAt: v.number(), revokedAt: v.optional(v.number()),
  }).index("by_refreshHash", ["refreshHash"]).index("by_userId", ["userId"]),
  chatConversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group")), directKey: v.optional(v.string()),
    name: v.string(), description: v.string(), createdBy: v.id("users"), createdAt: v.number(), updatedAt: v.number(),
    official: v.boolean(), autoJoin: v.boolean(), archived: v.boolean(), lastSeq: v.number(), memberCount: v.number(),
    lastMessage: v.optional(v.string()), lastSenderId: v.optional(v.id("users")),
  }).index("by_directKey", ["directKey"]).index("by_autoJoin_and_archived", ["autoJoin", "archived"]),
  chatMembers: defineTable({
    conversationId: v.id("chatConversations"), userId: v.id("users"), active: v.boolean(),
    memberRole: v.union(v.literal("owner"), v.literal("member")), joinedAt: v.number(),
    lastReadSeq: v.number(), lastReadAt: v.number(), sentCount: v.number(), readSentCount: v.number(),
  }).index("by_userId_and_active", ["userId", "active"])
    .index("by_conversationId_and_userId", ["conversationId", "userId"])
    .index("by_conversationId_and_active", ["conversationId", "active"]),
  chatMessages: defineTable({
    conversationId: v.id("chatConversations"), senderId: v.id("users"), body: v.string(),
    seq: v.number(), senderSeq: v.number(), clientId: v.string(), createdAt: v.number(),
  }).index("by_conversationId_and_seq", ["conversationId", "seq"])
    .index("by_conversationId_and_senderId_and_seq", ["conversationId", "senderId", "seq"])
    .index("by_conversationId_and_senderId_and_clientId", ["conversationId", "senderId", "clientId"]),
  chatPresence: defineTable({
    userId: v.id("users"), sessionId: v.id("authSessions"), tabId: v.string(), lastSeen: v.number(), expiresAt: v.number(),
  }).index("by_userId_and_expiresAt", ["userId", "expiresAt"])
    .index("by_userId_and_lastSeen", ["userId", "lastSeen"])
    .index("by_sessionId_and_tabId", ["sessionId", "tabId"]),
  chatRateLimits: defineTable({ key: v.string(), startedAt: v.number(), count: v.number() }).index("by_key", ["key"]),
});

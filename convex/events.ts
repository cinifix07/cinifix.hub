import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./authHelpers";
import { reportPage, reportScope, requireReportOwner } from "./reportAccess";

export const listPage = query({
  args: { createdBy: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const createdBy = reportScope(await requireUser(ctx), args.createdBy);
    const rows = createdBy === undefined
      ? ctx.db.query("events")
      : ctx.db.query("events").withIndex("by_createdBy_and_createdAt", (q) => q.eq("createdBy", createdBy));
    return await rows.order("desc").paginate(reportPage(args.paginationOpts));
  },
});

export async function resolveEvent(
  ctx: MutationCtx,
  args: { eventId?: Id<"events"> | null; newEventName?: string; createdBy: string },
) {
  const auth = await requireUser(ctx);
  requireReportOwner(auth, args.createdBy);
  const newName = args.newEventName?.trim();
  if (args.newEventName !== undefined && !newName) throw new Error("Event name is required.");
  if (newName && args.eventId) throw new Error("Choose an existing event or create a new one.");
  if (newName) {
    if (newName.length > 200) throw new Error("Event name must be 200 characters or fewer.");
    return await ctx.db.insert("events", { name: newName, createdBy: args.createdBy, createdAt: Date.now() });
  }
  if (args.eventId) {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("The selected event no longer exists.");
    requireReportOwner(auth, event.createdBy);
  }
  return args.eventId || undefined;
}

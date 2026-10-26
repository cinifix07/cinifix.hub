import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// createdBy is a data scope, matching the existing application. It is not an
// authorization credential; authentication hardening is a separate change.
export const listPage = query({
  args: { createdBy: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const rows = args.createdBy === undefined
      ? ctx.db.query("events")
      : ctx.db.query("events").withIndex("by_createdBy_and_createdAt", (q) => q.eq("createdBy", args.createdBy!.trim()));
    return await rows.order("desc").paginate(args.paginationOpts);
  },
});

export async function resolveEvent(
  ctx: MutationCtx,
  args: { eventId?: Id<"events"> | null; newEventName?: string; createdBy: string },
) {
  const newName = args.newEventName?.trim();
  if (args.newEventName !== undefined && !newName) throw new Error("Event name is required.");
  if (newName && args.eventId) throw new Error("Choose an existing event or create a new one.");
  if (newName) {
    if (newName.length > 200) throw new Error("Event name must be 200 characters or fewer.");
    return await ctx.db.insert("events", { name: newName, createdBy: args.createdBy, createdAt: Date.now() });
  }
  if (args.eventId && !(await ctx.db.get(args.eventId))) throw new Error("The selected event no longer exists.");
  return args.eventId || undefined;
}

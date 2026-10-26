import { ConvexError } from "convex/values";
import { requireUser, userRole } from "./authHelpers";
import type { PaginationOptions } from "convex/server";

type ReportIdentity = Awaited<ReturnType<typeof requireUser>>;

export function reportScope(auth: ReportIdentity, requested?: string) {
  if (userRole(auth.user) === "admin") return requested === undefined ? undefined : requested.trim() || auth.user.name;
  if (requested !== undefined && requested.trim() && requested.trim() !== auth.user.name) throw new ConvexError("You can only access your own reports and events.");
  return auth.user.name;
}
export function requireReportOwner(auth: ReportIdentity, createdBy: string) {
  if (userRole(auth.user) !== "admin" && createdBy !== auth.user.name) throw new ConvexError("You do not have access to this report.");
}
export function reportPage(options: PaginationOptions) {
  // Narratives may be large. Keep each response bounded, including direct API calls.
  return { ...options, numItems: Math.min(Math.max(Math.floor(options.numItems), 1), 10) };
}

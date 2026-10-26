/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */
  
  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as audit from "../audit.js";
import type * as authHelpers from "../authHelpers.js";
import type * as chat_conversations from "../chat/conversations.js";
import type * as chat_groups from "../chat/groups.js";
import type * as chat_limits from "../chat/limits.js";
import type * as chat_messages from "../chat/messages.js";
import type * as chat_presence from "../chat/presence.js";
import type * as chat_shared from "../chat/shared.js";
import type * as events from "../events.js";
import type * as narratives from "../narratives.js";
import type * as sessionActions from "../sessionActions.js";
import type * as sessions from "../sessions.js";
import type * as tasks from "../tasks.js";
import type * as userActions from "../userActions.js";
import type * as userArchives from "../userArchives.js";
import type * as userLogs from "../userLogs.js";
import type * as users from "../users.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "audit": typeof audit,
"authHelpers": typeof authHelpers,
"chat/conversations": typeof chat_conversations,
"chat/groups": typeof chat_groups,
"chat/limits": typeof chat_limits,
"chat/messages": typeof chat_messages,
"chat/presence": typeof chat_presence,
"chat/shared": typeof chat_shared,
"events": typeof events,
"narratives": typeof narratives,
"sessionActions": typeof sessionActions,
"sessions": typeof sessions,
"tasks": typeof tasks,
"userActions": typeof userActions,
"userArchives": typeof userArchives,
"userLogs": typeof userLogs,
"users": typeof users,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
  
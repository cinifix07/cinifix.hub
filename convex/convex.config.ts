import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({ env: {
  CINIFIX_AUTH_PRIVATE_KEY: v.optional(v.string()),
  CINIFIX_AUTH_PUBLIC_JWK: v.optional(v.string()),
  CINIFIX_AUTH_ISSUER: v.optional(v.string()),
} });

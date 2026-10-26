import type { AuthConfig } from "convex/server";

// Public provider configuration only. No signing keys are created or set here.
const issuer = process.env.CINIFIX_AUTH_ISSUER;
export default {
  providers: issuer ? [{ type: "customJwt", issuer, applicationID: "cinifix", algorithm: "RS256", jwks: `${issuer.replace(/\/$/, "")}/.well-known/jwks.json` }] : [],
} satisfies AuthConfig;

import { httpRouter } from "convex/server";
import { httpAction, env } from "./_generated/server";

const http = httpRouter();
http.route({ path: "/.well-known/jwks.json", method: "GET", handler: httpAction(async () => {
  if (!env.CINIFIX_AUTH_PUBLIC_JWK) return new Response("Sign-in configuration unavailable", { status: 503 });
  let key;
  try { key = JSON.parse(env.CINIFIX_AUTH_PUBLIC_JWK); }
  catch { return new Response("Invalid public key configuration", { status: 503 }); }
  // Never return private RSA fields, even if a configuration value is incorrect.
  if (!key || key.kty !== "RSA" || typeof key.n !== "string" || typeof key.e !== "string") return new Response("Invalid public key configuration", { status: 503 });
  return Response.json({ keys: [{ kty: "RSA", n: key.n, e: key.e, alg: "RS256", use: "sig", kid: "cinifix-session-v1" }] }, { headers: { "Cache-Control": "public, max-age=300" } });
}) });
export default http;

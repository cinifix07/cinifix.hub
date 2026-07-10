import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? import.meta.env.CONVEX_URL;
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

if (!convexUrl) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Configuration error</h1>
        <p>Set <code>VITE_CONVEX_URL</code> in Vercel environment variables.</p>
      </div>
    </React.StrictMode>
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </React.StrictMode>
  );
}

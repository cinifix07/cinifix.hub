/* eslint-disable react-refresh/only-export-components -- This is the application entry point. */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const errorPageStyle = {
  padding: "2rem",
  fontFamily: "system-ui, sans-serif",
  color: "#172033",
};

function ConfigurationError({ message }) {
  return (
    <main style={errorPageStyle}>
      <h1>Application configuration error</h1>
      <p>{message}</p>
    </main>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CINIFIX failed to render", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={errorPageStyle}>
          <h1>Unable to load CINIFIX</h1>
          <p>Refresh the page. If the problem continues, check the browser console and deployment environment.</p>
        </main>
      );
    }

    return this.props.children;
  }
}

function render(content) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppErrorBoundary>{content}</AppErrorBoundary>
    </React.StrictMode>,
  );
}

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  render(
    <ConfigurationError message="Set VITE_CONVEX_URL for the Production environment in Vercel, then redeploy." />,
  );
} else {
  try {
    const convex = new ConvexReactClient(convexUrl);

    render(
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>,
    );
  } catch (error) {
    console.error("Invalid VITE_CONVEX_URL", error);
    render(
      <ConfigurationError message="VITE_CONVEX_URL is invalid. Copy the deployment URL from the Convex dashboard and redeploy." />,
    );
  }
}

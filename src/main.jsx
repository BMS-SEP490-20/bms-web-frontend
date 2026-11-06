/**
 * @file main.jsx
 * @description Application bootstrap script mounting the React tree into the root DOM node.
 * Initializes Bootstrap styling, core CSS tokens, and application routing.
 * Conforms to: Production Engineering Standards & AGENTS-CODE.md.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./styles/bms-tokens.css";
import "./styles/bms-foundation.css";
import App from "./App.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Mount root component inside React StrictMode to catch side effects and deprecated lifecycles in development
createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        {GOOGLE_CLIENT_ID ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <App />
            </GoogleOAuthProvider>
        ) : (
            <App />
        )}
    </React.StrictMode>
);
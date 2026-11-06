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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "622747466562-hfet3u28cr86125gtpaei8sj69meer4t.apps.googleusercontent.com";

// Mount root component inside React StrictMode to catch side effects and deprecated lifecycles in development
createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <App />
        </GoogleOAuthProvider>
    </React.StrictMode>
);
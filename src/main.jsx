/**
 * @file main.jsx
 * @description Application bootstrap script mounting the React tree into the root DOM node.
 * Initializes Bootstrap styling, core CSS tokens, and application routing.
 * Conforms to: Production Engineering Standards & AGENTS-CODE.md.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.jsx";

// Mount root component inside React StrictMode to catch side effects and deprecated lifecycles in development
createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
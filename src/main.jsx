import React from "react";
import { createRoot } from "react-dom/client";
import PatientHomepage from "./features/patient-portal/pages/PatientHomepage.jsx";

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <PatientHomepage />
    </React.StrictMode>
);
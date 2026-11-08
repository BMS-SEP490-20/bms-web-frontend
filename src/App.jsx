/**
 * @file App.jsx
 * @description Master client-side routing hierarchy for BMS Laboratory Management Portal.
 * Integrates public patient portals, ISO 15189 clinical service catalogs (UC01),
 * authentication flows (UC02-UC10), and role-protected clinical/administrative workflows.
 * 
 * SECURITY BOUNDARY NOTICE:
 * Client-side route protections (ProtectedRoute) serve purely as UX routing guards to prevent
 * unauthorized navigation and layout flashing. Server-side API gateway and controllers
 * remain the sole authoritative security boundary enforcing JWT validation and claims.
 * 
 * Conforms to: Production Medical Standards ISO 15189, HIPAA Privacy, & AGENTS-CODE.md.
 */

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

// Layouts, Global State Providers & Error Boundaries
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { NotificationProvider as NotificationContextProvider, useNotificationContext } from "./shared/contexts/NotificationContext";
import NotificationProvider from "./shared/components/Notification/NotificationProvider";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ROLES, ALL_ROLES, resolveRoleId, getStoredUser } from "./constants/roles";

// Authentication & Http Error Views
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword.jsx";
import ChangePassword from "./features/auth/ChangePassword";
import NotFound404 from "./components/errors/NotFound404";
import Forbidden403 from "./components/errors/Forbidden403";
import HomePage from "./features/home/HomePage.jsx";
import GuestHomePage from "./features/home/GuestHomePage.jsx";

// Clinical, Consultation & Receptionist Views
import RoleBasedDashboard from "./features/manager-dashboard/pages/RoleDashboard";
import UserProfilePage from "./features/patient/pages/UserProfilePage";
import CheckInPage from "./features/reception/pages/CheckInPage.jsx";
import ReceptionistCheckIn from "./features/reception/components/Receptionist/ReceptionistCheckIn.jsx";
import RegisterWalkInPatientPage from "./features/walkin/pages/RegisterWalkInPage.jsx";
import QueueBoardPage from "./features/reception/pages/QueueBoardPage.jsx";
import PublicQueueBoardPage from "./features/reception/pages/PublicQueueBoardPage.jsx";
import DoctorConsolePage from "./features/doctor/pages/DoctorConsolePage.jsx";
import MedicalRecordPage from "./features/doctor/pages/MedicalRecordPage.jsx";
import AddMedicalNotesPage from "./features/doctor/pages/AddMedicalNotesPage.jsx";
import MedicalAssessmentListPage from "./features/doctor/pages/MedicalAssessmentListPage.jsx";
import AddMedicalAssessmentPage from "./features/doctor/pages/AddMedicalAssessmentPage.jsx";
import CreateTestOrderPage from "./features/doctor/pages/CreateTestOrderPage.jsx";
import DoctorSchedulePage from "./features/doctor-schedule/pages/DoctorSchedulePage";
import ViewShiftsPage from "./features/view-shifts/pages/ViewShiftsPage.jsx";

// Laboratory Operations, QC, IoT & Inventory Views
import SampleQueuePage from "./features/laboratory/pages/SampleQueuePage";
import CheckInSamplePage from "./features/sample-checkin/pages/CheckInSamplePage.jsx";
import SampleTimelinePage from "./features/laboratory/pages/SampleTimelinePage.jsx";
import TestBatchManagementPage from "./features/laboratory/pages/TestBatchManagementPage.jsx";
import SampleListPage from "./features/laboratory/pages/SampleListPage.jsx";
import SampleRerunPage from "./features/laboratory/pages/SampleRerunPage.jsx";
import AddTestNotePage from "./features/laboratory/pages/AddTestNotePage.jsx";
import VerifyTestResultsPage from "./features/laboratory/pages/VerifyTestResultsPage.jsx";
import EnterTestResultsPage from "./features/test-results/pages/EnterTestResultsPage.jsx";
import TraceSampleOriginPage from "./features/laboratory/pages/TraceSampleOriginPage.jsx";
import SpecimenHistoryPage from "./features/laboratory/pages/SpecimenHistoryPage.jsx";
import LookupBiochemicalResultsPage from "./features/laboratory/pages/LookupBiochemicalResultsPage.jsx";
import NotifyTestResultsPage from "./features/laboratory/pages/NotifyTestResultsPage.jsx";
import TestCriteriaPage from "./features/laboratory/pages/TestCriteriaPage";
import ConfigureReferenceIntervalsPage from "./features/laboratory/pages/ConfigureReferenceIntervalsPage.jsx";
import LabProfilesPage from "./features/lab-profiles/pages/LabProfilesPage.jsx";
import LabRoomManagement from "./features/facilities/pages/LabRoomManagementPage";
import ValidateSample from "./features/lab-user/pages/ValidateSample.jsx";
import QcFlagsPage from "./features/qc/pages/QcFlagsPage.jsx";
import QualityControlManagementPage from "./features/qc/pages/QualityControlManagementPage.jsx";
import InventoryPage from "./features/inventory/pages/InventoryPage.jsx";
import ConfigureIotThresholdsPage from "./features/manager-dashboard/pages/ConfigureIotThresholdsPage.jsx";
import AlertThresholdViolationPage from "./features/iot/pages/AlertThresholdViolationPage.jsx";
import IotMonitorPage from "./features/manager-dashboard/pages/IotMonitorPage.jsx";
import GlobalIotAlertPopup from "./features/iot/components/GlobalIotAlertPopup.jsx";

// Patient Services, Scheduling & Billing Views
import ServiceCatalogPage from "./features/catalog/pages/ServiceCatalogPage";
import PricingPage from "./features/catalog/pages/PricingPage.jsx";
import IsoProcessPage from "./features/home/pages/IsoProcessPage.jsx";
import BookAppointmentPage from "./features/appointment/pages/BookAppointmentPage.jsx";
import AppointmentListPage from "./features/appointment/pages/AppointmentListPage.jsx";
import AppointmentConfirmationPage from "./features/appointment/pages/AppointmentConfirmationPage";
import TestHistoryPage from "./features/patient/pages/TestHistoryPage.jsx";
import TestReportPage from "./features/patient/pages/TestReportPage.jsx";
import ExportTestResultPdfPage from "./features/patient/pages/ExportTestResultPdfPage.jsx";
import TrackTestProgressPage from "./features/patient/pages/TrackTestProgressPage.jsx";
import BillingInvoicesPage from "./features/billing/pages/BillingInvoicesPage.jsx";
import PatientPaymentHistoryPage from "./features/patient/pages/PatientPaymentHistoryPage.jsx";
import ProcessPaymentPage from "./features/billing/pages/ProcessPaymentPage.jsx";
import CalculateFeesPage from "./features/billing/pages/CalculateFeesPage.jsx";
import FeedbackHubPage from "./features/feedback/pages/FeedbackHubPage.jsx";
import InitialMedicalProfileSetup from "./features/patient/pages/InitialMedicalProfileSetup.jsx";

// System Administration, Notifications Center & Security Views
import UserManagementPage from "./features/users/pages/UserManagementPage.jsx";
import RolesManagementPage from "./features/user-management/pages/RolesManagementPage";
import ServicePackagesPage from "./features/admin/pages/ServicePackagesPage.jsx";
import ScheduleManagementPage from "./features/schedule/pages/ManageSchedulePage.jsx";
import BackupManagementPage from "./features/backup/pages/BackupManagementPage.jsx";
import AuditLogPage from "./features/audit/pages/AuditLogPage.jsx";
import TatStatisticsDashboardPage from "./features/reports/pages/TatStatisticsDashboardPage.jsx";
import RevenueReportPage from "./features/reports/pages/RevenueReportPage.jsx";
import PushNotificationCenterPage from "./features/notifications/pages/PushNotificationCenterPage.jsx";

// API Clients & UI Icons
import { fetchServiceCatalog } from "./features/catalog/api/catalogApi";
import api from "./config/api";
import {
  FaVial, FaPhoneAlt, FaClock, FaCheckCircle, FaSearch, FaArrowRight, FaShieldAlt,
  FaFileMedicalAlt, FaMicroscope, FaCalendarCheck, FaHospital, FaLock, FaUserMd,
  FaUserCircle, FaSignOutAlt, FaFileInvoiceDollar, FaHistory, FaTimes
} from "react-icons/fa";
import "./app.css";
import "./styles/bms-workbench.css";

// =============================================================================
// AUTHORIZATION & CLIENT-SIDE ACCESS CONTROL
// =============================================================================
// WHY: one guard (src/routes/ProtectedRoute.jsx) and one role table (src/constants/roles.js). The copy that used
// to live here mapped 3 = Doctor / 4 = LabTech / 5 = Patient and turned unknown roles into PATIENT.
const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

// =============================================================================
// PUBLIC CLINICAL PORTAL & PATIENT PORTAL
// =============================================================================
// HomePage is imported from features/home/HomePage.jsx.

// =============================================================================
// ROOT APPLICATION ROUTER
// =============================================================================

/**
 * Top-level application component assembling security providers and nested route tables.
 * Nested grouping minimizes route declarations while preserving atomic role permissions.
 */
/**
 * Smart Invoice / Payment History Route Handler.
 * Staff (Receptionist, Manager) view official facility billing management.
 * Patients view their personal electronic receipt and payment history.
 */
function InvoicesRoute() {
  const user = getStoredUser();
  const roleId = resolveRoleId(user);
  if (roleId === ROLES.PATIENT) {
    return <Navigate to="/patient/payment-history" replace />;
  }
  return <BillingInvoicesPage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationContextProvider>
          <Router>
            <Routes>
              {/* --- 1. Public Portals & Catalogs (UC01, UC15/UC20 view, UC48 lookup by code with PII masked) --- */}
              <Route path="/" element={<HomePage />} />
              <Route path="/guest" element={<GuestHomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/services" element={<ServiceCatalogPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/catalog" element={<PricingPage />} />
              <Route path="/iso-process" element={<IsoProcessPage />} />
              <Route path="/tracking" element={<TrackTestProgressPage />} />
              <Route path="/tracking/:identifier" element={<TrackTestProgressPage />} />
              <Route path="/patient" element={<Navigate to="/" replace />} />

              {/* --- 2. Authentication Workflows --- */}
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AuthLayout />}>
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>


              {/* --- 3. Queue board displays: login required until Phát approves a public board (TIEU-CHI C3) --- */}
              <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST]} />}>
                <Route path="/reception/queue-board" element={<PublicQueueBoardPage />} />
                <Route path="/queue-board" element={<PublicQueueBoardPage />} />
              </Route>

              {/* --- 4. Authenticated Medical Modules (MainLayout). Role lists follow ROLE-PERMISSION-MATRIX §1. --- */}
              <Route element={<MainLayout />}>

                {/* Profile, password, own notifications & medical intake */}
                <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
                  <Route path="/profile" element={<UserProfilePage />} />
                  <Route path="/patient/medical-profile-setup" element={<InitialMedicalProfileSetup />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/notifications" element={<PushNotificationCenterPage />} />
                  <Route path="/notifications/center" element={<PushNotificationCenterPage />} />
                </Route>

                {/* Operational Dashboard for Staff: Admin, Manager, Doctor, Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER, DOCTOR, LAB, RECEPTIONIST]} />}>
                  <Route path="/dashboard" element={<RoleBasedDashboard />} />
                </Route>

                {/* Admin Notifications */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN]} />}>
                  <Route path="/admin/notifications" element={<PushNotificationCenterPage />} />
                </Route>

                {/* UC58 dispatch: Lab, Manager, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER, RECEPTIONIST]} />}>
                  <Route path="/notifications/dispatch" element={<PushNotificationCenterPage />} />
                </Route>

                {/* UC79 feedback: Patient submits, Manager reviews */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, PATIENT]} />}>
                  <Route path="/feedback" element={<FeedbackHubPage />} />
                  <Route path="/patient/feedback" element={<FeedbackHubPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={[MANAGER]} />}>
                  <Route path="/manager/feedback" element={<FeedbackHubPage />} />
                </Route>

                {/* UC23 view appointments: Receptionist, Manager, Doctor (assigned), Patient (own) */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, MANAGER, DOCTOR, PATIENT]} />}>
                  <Route path="/appointments" element={<AppointmentListPage />} />
                </Route>

                {/* UC21/UC22 book + confirmation: Patient (own), Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, RECEPTIONIST]} />}>
                  <Route path="/appointments/book" element={<BookAppointmentPage />} />
                  <Route path="/appointments/confirmation" element={<AppointmentConfirmationPage />} />
                  <Route path="/appointments/:id/confirmation" element={<AppointmentConfirmationPage />} />
                  {/* Patient pays own invoice by VNPay; Receptionist takes counter payment (ruling 30/10) */}
                  <Route path="/payments/checkout" element={<ProcessPaymentPage />} />
                  <Route path="/payments/checkout/:invoiceId" element={<ProcessPaymentPage />} />
                </Route>

                {/* UC36 view shifts: Admin, Manager, Doctor, Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER, DOCTOR, LAB, RECEPTIONIST]} />}>
                  <Route path="/shifts/view" element={<ViewShiftsPage />} />
                </Route>

                {/* UC35/UC16 shift schedule view: Admin, Manager, Doctor, Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR, MANAGER, ADMIN, LAB, RECEPTIONIST]} />}>
                  <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/schedule" element={<DoctorSchedulePage />} />
                </Route>

                {/* UC42 view/download report: Patient (own), Doctor, Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/reports/:orderId" element={<TestReportPage />} />
                  <Route path="/results/:orderId/report" element={<TestReportPage />} />
                  <Route path="/patient/results/:orderId" element={<TestReportPage />} />
                </Route>

                {/* UC62 export result PDF: Patient (own), Doctor */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, DOCTOR]} />}>
                  <Route path="/results/export/:orderId" element={<ExportTestResultPdfPage />} />
                  <Route path="/patient/results" element={<ExportTestResultPdfPage />} />
                  <Route path="/patient/results/export/:orderId" element={<ExportTestResultPdfPage />} />
                </Route>

                {/* UC48 tracking list/search: Patient (own), Receptionist, Doctor, Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT, RECEPTIONIST, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/patient/tracking" element={<TrackTestProgressPage />} />
                  <Route path="/patient/tracking/:identifier" element={<TrackTestProgressPage />} />
                </Route>

                {/* UC76 test history: Manager, Lab, Doctor, Patient (own). Admin and Receptionist denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, LAB, DOCTOR, PATIENT]} />}>
                  <Route path="/patient/test-history" element={<TestHistoryPage />} />
                </Route>

                {/* UC30 view patient information: Receptionist, Doctor, Lab, Manager. Admin denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, DOCTOR, LAB, MANAGER]} />}>
                  <Route path="/patients" element={<CheckInPage />} />
                </Route>

                {/* Front desk: check-in, guest/walk-in (UC25-UC29), queue (UC27/UC28), fees (UC53) - Receptionist only */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST]} />}>
                  <Route path="/reception/checkin" element={<ReceptionistCheckIn />} />
                  <Route path="/reception/check-in" element={<ReceptionistCheckIn />} />
                  <Route path="/receptionist/check-in" element={<ReceptionistCheckIn />} />
                  <Route path="/reception/create-patient" element={<RegisterWalkInPatientPage />} />
                  <Route path="/receptionist/create-patient" element={<RegisterWalkInPatientPage />} />
                  <Route path="/reception/register-walkin" element={<RegisterWalkInPatientPage />} />
                  <Route path="/reception/queue" element={<QueueBoardPage />} />
                  <Route path="/queue" element={<QueueBoardPage />} />
                  {/* WHY: UC53 is Receptionist-only (matrix §1.8, §3.3); these URLs used to be public. */}
                  <Route path="/calculate-fees" element={<CalculateFeesPage />} />
                  <Route path="/fee-calculator" element={<CalculateFeesPage />} />
                  <Route path="/billing/calculate-fee" element={<CalculateFeesPage />} />
                  <Route path="/patient/fee-calculator" element={<CalculateFeesPage />} />
                </Route>

                {/* UC18 & UC54 Billing Invoices Management: Staff only (Receptionist, Manager) */}
                <Route element={<ProtectedRoute allowedRoles={[RECEPTIONIST, MANAGER]} />}>
                  <Route path="/invoices" element={<BillingInvoicesPage />} />
                  <Route path="/billing/invoices" element={<BillingInvoicesPage />} />
                </Route>

                {/* Patient Payment History: Patient only */}
                <Route element={<ProtectedRoute allowedRoles={[PATIENT]} />}>
                  <Route path="/patient/payments" element={<PatientPaymentHistoryPage />} />
                  <Route path="/patient/payment-history" element={<PatientPaymentHistoryPage />} />
                </Route>

                {/* Doctor work: console, notes (UC51), orders (UC32), new assessment (UC50) */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR]} />}>
                  <Route path="/doctor/console" element={<DoctorConsolePage />} />
                  <Route path="/doctor/medical-notes" element={<AddMedicalNotesPage />} />
                  <Route path="/medical-assessments/add" element={<AddMedicalAssessmentPage />} />
                  <Route path="/doctor/assessments/:id/edit" element={<AddMedicalAssessmentPage />} />
                  <Route path="/medical-assessments/:id/edit" element={<AddMedicalAssessmentPage />} />
                  <Route path="/doctor/orders/create" element={<CreateTestOrderPage />} />
                </Route>

                {/* UC33/UC50 view EMR + assessments: Doctor; Manager view. Admin denied (decision 10). */}
                <Route element={<ProtectedRoute allowedRoles={[DOCTOR, MANAGER]} />}>
                  <Route path="/doctor/emr" element={<MedicalRecordPage />} />
                  <Route path="/medical-records" element={<MedicalRecordPage />} />
                  <Route path="/medical-assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/doctor/assessments" element={<MedicalAssessmentListPage />} />
                  <Route path="/medical-assessments/:id" element={<AddMedicalAssessmentPage />} />
                </Route>

                {/* Lab bench work owned by Lab: sample list (UC37), result entry (UC46) */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER]} />}>
                  <Route path="/lab/queue" element={<SampleQueuePage />} />
                  <Route path="/laboratory/samples" element={<SampleQueuePage />} />
                  <Route path="/lab-user/validate-sample" element={<ValidateSample />} />
                  <Route path="/laboratory/enter-test-results" element={<EnterTestResultsPage />} />
                  <Route path="/laboratory/batches" element={<TestBatchManagementPage />} />
                  <Route path="/laboratory/verify-results" element={<VerifyTestResultsPage />} />
                  <Route path="/laboratory/verify-results/:specimenId" element={<VerifyTestResultsPage />} />
                  <Route path="/laboratory/notifications" element={<NotifyTestResultsPage />} />
                  <Route path="/laboratory/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/lab-user/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/manager/qc-flags" element={<QcFlagsPage />} />
                  <Route path="/qc/management" element={<QualityControlManagementPage />} />
                  <Route path="/laboratory/qc" element={<QualityControlManagementPage />} />
                  <Route path="/laboratory/quality-control" element={<QualityControlManagementPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={[LAB]} />}>
                  <Route path="/laboratory/sample-list" element={<SampleListPage />} />
                </Route>

                {/* UC41 sample check-in: Lab, Receptionist */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, RECEPTIONIST]} />}>
                  <Route path="/laboratory/checkinsample" element={<CheckInSamplePage />} />
                </Route>

                {/* Lab chain views: Lab, Manager, Doctor (UC47 rerun view, UC52 notes, UC70, UC71, UC77, UC18/UC57 view) */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER, DOCTOR]} />}>
                  <Route path="/laboratory/rerun-requests" element={<SampleRerunPage />} />
                  <Route path="/laboratory/samples/:id/rerun" element={<SampleRerunPage />} />
                  <Route path="/laboratory/test-notes" element={<AddTestNotePage />} />
                  <Route path="/laboratory/specimens/:specimenId/notes" element={<AddTestNotePage />} />
                  <Route path="/laboratory/sample-timeline" element={<SampleTimelinePage />} />
                  <Route path="/laboratory/specimens/history" element={<SpecimenHistoryPage />} />
                  <Route path="/laboratory/biochemical-results" element={<LookupBiochemicalResultsPage />} />
                  <Route path="/laboratory/lookup-results" element={<LookupBiochemicalResultsPage />} />
                  <Route path="/laboratory/trace" element={<TraceSampleOriginPage />} />
                  <Route path="/laboratory/trace/:specimenId" element={<TraceSampleOriginPage />} />
                  <Route path="/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/criteria" element={<TestCriteriaPage />} />
                  <Route path="/laboratory/reference-intervals" element={<ConfigureReferenceIntervalsPage />} />
                </Route>

                {/* UC34 lab rooms, UC61 lab profiles: Manager, Admin */}
                <Route element={<ProtectedRoute allowedRoles={[MANAGER, ADMIN]} />}>
                  <Route path="/laboratory/rooms" element={<LabRoomManagement />} />
                  <Route path="/admin/lab-rooms" element={<LabRoomManagement />} />
                  <Route path="/laboratory/lab-profiles" element={<LabProfilesPage />} />
                </Route>

                {/* UC56 inventory: Admin, Manager, Lab (Doctor denied, decision 10). UC67 IoT thresholds view: same set. */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER, LAB]} />}>
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/manager/inventory-management" element={<InventoryPage />} />
                  <Route path="/admin/inventory-management" element={<InventoryPage />} />
                  <Route path="/manager/iot-thresholds" element={<ConfigureIotThresholdsPage />} />
                  <Route path="/laboratory/iot-thresholds" element={<ConfigureIotThresholdsPage />} />
                  <Route path="/iot/monitor" element={<IotMonitorPage />} />
                  <Route path="/iot/temperature" element={<IotMonitorPage />} />
                  <Route path="/iot/logs" element={<IotMonitorPage />} />
                  <Route path="/manager/iot-monitor" element={<IotMonitorPage />} />
                  <Route path="/laboratory/iot-monitor" element={<IotMonitorPage />} />
                </Route>

                {/* UC35 shift rostering (View/Create/Update/Delete Shifts): Manager */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/manage/schedule" element={<DoctorSchedulePage />} />
                  <Route path="/manager/shift-assignment" element={<DoctorSchedulePage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={[DOCTOR, LAB, RECEPTIONIST]} />}>
                  <Route path="/schedule/personal" element={<ScheduleManagementPage />} />
                </Route>

                {/* UC68 IoT alerts: Lab, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[LAB, MANAGER]} />}>
                  <Route path="/iot/alerts" element={<AlertThresholdViolationPage />} />
                  <Route path="/laboratory/iot-alerts" element={<AlertThresholdViolationPage />} />
                </Route>

                {/* UC63 TAT, UC78 revenue (Manager view only): Admin, Manager */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/reports/revenue" element={<RevenueReportPage />} />
                  <Route path="/admin/revenue-report" element={<RevenueReportPage />} />
                  <Route path="/manager/revenue" element={<RevenueReportPage />} />
                  <Route path="/reports/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/reports/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat" element={<TatStatisticsDashboardPage />} />
                  <Route path="/laboratory/tat-statistics" element={<TatStatisticsDashboardPage />} />
                  <Route path="/admin/tat-statistics" element={<TatStatisticsDashboardPage />} />
                </Route>

                {/* UC15/UC19 package management: Admin + Manager (Quy trình DOT2 follow-up 2, pending Phát).
                    WHY: UC19 test packages are edited through the same service-packages screen and API. */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN, MANAGER]} />}>
                  <Route path="/packages" element={<ServicePackagesPage />} />
                  <Route path="/admin/packages" element={<ServicePackagesPage />} />
                </Route>

                {/* Admin only: accounts (UC14), roles (UC13), audit (UC64, C5), backup (UC80) */}
                <Route element={<ProtectedRoute allowedRoles={[ADMIN]} />}>
                  <Route path="/admin/employees" element={<UserManagementPage />} />
                  <Route path="/admin/users" element={<UserManagementPage />} />
                  <Route path="/admin/user-management" element={<UserManagementPage />} />
                  {/* WHY: DoctorManagementPage was never committed; doctor accounts are managed in UserManagementPage. */}
                  <Route path="/admin/doctor-management" element={<UserManagementPage />} />
                  <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                  <Route path="/admin/backup" element={<BackupManagementPage />} />
                  <Route path="/backup" element={<BackupManagementPage />} />
                  <Route path="/roles" element={<RolesManagementPage />} />
                  <Route path="/admin/role-management" element={<RolesManagementPage />} />
                </Route>
              </Route>


              {/* Legacy URLs whose role-prefixed copies gave the wrong roles access; redirect so the canonical
                  route's guard decides (no 404 for old bookmarks). */}
              {[["/doctor/feedback", "/feedback"], ["/receptionist/feedback", "/feedback"], ["/admin/feedback", "/feedback"],
                ["/admin/invoices", "/invoices"], ["/admin/qc-flags", "/laboratory/qc-flags"], ["/lab-user/lab-rooms", "/laboratory/rooms"],
                ["/manager/audit-logs", "/admin/audit-logs"], ["/admin/shift-assignment", "/manager/shift-assignment"],
                ["/admin/iot-alerts", "/iot/alerts"],
                // URLs dropped in 18cf0eb (rewrite of App.jsx); restored as aliases of the current screens.
                ["/admin/backups", "/admin/backup"], ["/laboratory/backup", "/admin/backup"], ["/billing/receipts", "/invoices"],
                ["/clinical/test-orders/create", "/doctor/orders/create"], ["/doctor/test-orders/create", "/doctor/orders/create"],
                ["/doctor/assessments/add", "/medical-assessments/add"], ["/iot/thresholds", "/manager/iot-thresholds"],
                ["/monitoring/iot-thresholds", "/manager/iot-thresholds"], ["/lab/batches", "/laboratory/batches"],
                ["/laboratory/notify-results", "/laboratory/notifications"], ["/laboratory/sample-intake/create-list", "/laboratory/sample-list"],
                ["/laboratory/sample-trace", "/laboratory/trace"], ["/laboratory/samples/request-rerun", "/laboratory/rerun-requests"],
                ["/laboratory/specimen-history", "/laboratory/specimens/history"], ["/specimens/history", "/laboratory/specimens/history"],
                ["/laboratory/test-notes/add", "/laboratory/test-notes"], ["/laboratory/verification", "/laboratory/verify-results"],
                ["/patient/payments/checkout", "/payments/checkout"], ["/patient/results/export", "/patient/results"],
                ["/reception/console", "/reception/checkin"], ["/reception/patients", "/patients"],
                ["/reference-intervals", "/laboratory/reference-intervals"], ["/reports", "/reports/tat"],
                ["/shifts", "/shifts/view"], ["/users", "/admin/users"], ["/receptionist/appointments", "/appointments"], ["/reception/appointments", "/appointments"], ["/doctor/appointments", "/appointments"], ["/lab-user/appointments", "/appointments"], ["/receptionist/sample-management", "/laboratory/samples"], ["/lab-user/sample-management", "/laboratory/samples"], ["/manager/sample-management", "/laboratory/samples"], ["/receptionist/services", "/services"], ["/manager/services", "/packages"], ["/doctor/dashboard", "/dashboard"], ["/receptionist/dashboard", "/dashboard"], ["/lab-user/dashboard", "/dashboard"], ["/admin/dashboard", "/dashboard"], ["/manager/dashboard", "/dashboard"]].map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}

              {/* --- 5. Error & Fallback Routes --- */}
              <Route path="/403" element={<Forbidden403 />} />
              <Route path="/404" element={<NotFound404 />} />
              <Route path="*" element={<NotFound404 />} />
            </Routes>
            <GlobalIotAlertPopup />
          </Router>
          <NotificationProvider />
        </NotificationContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

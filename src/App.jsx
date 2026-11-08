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

import React, { useState, useEffect, lazy, Suspense } from "react";
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
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage.jsx"));
const Register = lazy(() => import("./features/auth/Register"));
const ForgotPassword = lazy(() => import("./features/auth/pages/ForgotPassword.jsx"));
const ChangePassword = lazy(() => import("./features/auth/ChangePassword"));
import NotFound404 from "./components/errors/NotFound404";
import Forbidden403 from "./components/errors/Forbidden403";
const HomePage = lazy(() => import("./features/home/HomePage.jsx"));
const GuestHomePage = lazy(() => import("./features/home/GuestHomePage.jsx"));

// Clinical, Consultation & Receptionist Views
const RoleBasedDashboard = lazy(() => import("./features/manager-dashboard/pages/RoleDashboard"));
const UserProfilePage = lazy(() => import("./features/patient/pages/UserProfilePage"));
const CheckInPage = lazy(() => import("./features/reception/pages/CheckInPage.jsx"));
const ReceptionistCheckIn = lazy(() => import("./features/reception/components/Receptionist/ReceptionistCheckIn.jsx"));
const RegisterWalkInPatientPage = lazy(() => import("./features/walkin/pages/RegisterWalkInPage.jsx"));
const QueueBoardPage = lazy(() => import("./features/reception/pages/QueueBoardPage.jsx"));
const PublicQueueBoardPage = lazy(() => import("./features/reception/pages/PublicQueueBoardPage.jsx"));
const DoctorConsolePage = lazy(() => import("./features/doctor/pages/DoctorConsolePage.jsx"));
const MedicalRecordPage = lazy(() => import("./features/doctor/pages/MedicalRecordPage.jsx"));
const AddMedicalNotesPage = lazy(() => import("./features/doctor/pages/AddMedicalNotesPage.jsx"));
const MedicalAssessmentListPage = lazy(() => import("./features/doctor/pages/MedicalAssessmentListPage.jsx"));
const AddMedicalAssessmentPage = lazy(() => import("./features/doctor/pages/AddMedicalAssessmentPage.jsx"));
const CreateTestOrderPage = lazy(() => import("./features/doctor/pages/CreateTestOrderPage.jsx"));
const DoctorSchedulePage = lazy(() => import("./features/doctor-schedule/pages/DoctorSchedulePage"));
const ViewShiftsPage = lazy(() => import("./features/view-shifts/pages/ViewShiftsPage.jsx"));

// Laboratory Operations, QC, IoT & Inventory Views
const SampleQueuePage = lazy(() => import("./features/laboratory/pages/SampleQueuePage"));
const CheckInSamplePage = lazy(() => import("./features/sample-checkin/pages/CheckInSamplePage.jsx"));
const SampleTimelinePage = lazy(() => import("./features/laboratory/pages/SampleTimelinePage.jsx"));
const TestBatchManagementPage = lazy(() => import("./features/laboratory/pages/TestBatchManagementPage.jsx"));
const SampleListPage = lazy(() => import("./features/laboratory/pages/SampleListPage.jsx"));
const SampleRerunPage = lazy(() => import("./features/laboratory/pages/SampleRerunPage.jsx"));
const AddTestNotePage = lazy(() => import("./features/laboratory/pages/AddTestNotePage.jsx"));
const VerifyTestResultsPage = lazy(() => import("./features/laboratory/pages/VerifyTestResultsPage.jsx"));
const EnterTestResultsPage = lazy(() => import("./features/test-results/pages/EnterTestResultsPage.jsx"));
const TraceSampleOriginPage = lazy(() => import("./features/laboratory/pages/TraceSampleOriginPage.jsx"));
const SpecimenHistoryPage = lazy(() => import("./features/laboratory/pages/SpecimenHistoryPage.jsx"));
const LookupBiochemicalResultsPage = lazy(() => import("./features/laboratory/pages/LookupBiochemicalResultsPage.jsx"));
const NotifyTestResultsPage = lazy(() => import("./features/laboratory/pages/NotifyTestResultsPage.jsx"));
const TestCriteriaPage = lazy(() => import("./features/laboratory/pages/TestCriteriaPage"));
const ConfigureReferenceIntervalsPage = lazy(() => import("./features/laboratory/pages/ConfigureReferenceIntervalsPage.jsx"));
const LabProfilesPage = lazy(() => import("./features/lab-profiles/pages/LabProfilesPage.jsx"));
const LabRoomManagement = lazy(() => import("./features/facilities/pages/LabRoomManagementPage"));
const ValidateSample = lazy(() => import("./features/lab-user/pages/ValidateSample.jsx"));
const QcFlagsPage = lazy(() => import("./features/qc/pages/QcFlagsPage.jsx"));
const QualityControlManagementPage = lazy(() => import("./features/qc/pages/QualityControlManagementPage.jsx"));
const InventoryPage = lazy(() => import("./features/inventory/pages/InventoryPage.jsx"));
const ConfigureIotThresholdsPage = lazy(() => import("./features/manager-dashboard/pages/ConfigureIotThresholdsPage.jsx"));
const AlertThresholdViolationPage = lazy(() => import("./features/iot/pages/AlertThresholdViolationPage.jsx"));
const IotMonitorPage = lazy(() => import("./features/manager-dashboard/pages/IotMonitorPage.jsx"));
import GlobalIotAlertPopup from "./features/iot/components/GlobalIotAlertPopup.jsx";

// Patient Services, Scheduling & Billing Views
const ServiceCatalogPage = lazy(() => import("./features/catalog/pages/ServiceCatalogPage"));
const PricingPage = lazy(() => import("./features/catalog/pages/PricingPage.jsx"));
const IsoProcessPage = lazy(() => import("./features/home/pages/IsoProcessPage.jsx"));
const BookAppointmentPage = lazy(() => import("./features/appointment/pages/BookAppointmentPage.jsx"));
const AppointmentListPage = lazy(() => import("./features/appointment/pages/AppointmentListPage.jsx"));
const AppointmentConfirmationPage = lazy(() => import("./features/appointment/pages/AppointmentConfirmationPage"));
const TestHistoryPage = lazy(() => import("./features/patient/pages/TestHistoryPage.jsx"));
const TestReportPage = lazy(() => import("./features/patient/pages/TestReportPage.jsx"));
const ExportTestResultPdfPage = lazy(() => import("./features/patient/pages/ExportTestResultPdfPage.jsx"));
const TrackTestProgressPage = lazy(() => import("./features/patient/pages/TrackTestProgressPage.jsx"));
const BillingInvoicesPage = lazy(() => import("./features/billing/pages/BillingInvoicesPage.jsx"));
const PatientPaymentHistoryPage = lazy(() => import("./features/patient/pages/PatientPaymentHistoryPage.jsx"));
const ProcessPaymentPage = lazy(() => import("./features/billing/pages/ProcessPaymentPage.jsx"));
const CalculateFeesPage = lazy(() => import("./features/billing/pages/CalculateFeesPage.jsx"));
const FeedbackHubPage = lazy(() => import("./features/feedback/pages/FeedbackHubPage.jsx"));
const InitialMedicalProfileSetup = lazy(() => import("./features/patient/pages/InitialMedicalProfileSetup.jsx"));

// System Administration, Notifications Center & Security Views
const UserManagementPage = lazy(() => import("./features/users/pages/UserManagementPage.jsx"));
const RolesManagementPage = lazy(() => import("./features/user-management/pages/RolesManagementPage"));
const ServicePackagesPage = lazy(() => import("./features/admin/pages/ServicePackagesPage.jsx"));
const ScheduleManagementPage = lazy(() => import("./features/schedule/pages/ManageSchedulePage.jsx"));
const BackupManagementPage = lazy(() => import("./features/backup/pages/BackupManagementPage.jsx"));
const AuditLogPage = lazy(() => import("./features/audit/pages/AuditLogPage.jsx"));
const TatStatisticsDashboardPage = lazy(() => import("./features/reports/pages/TatStatisticsDashboardPage.jsx"));
const RevenueReportPage = lazy(() => import("./features/reports/pages/RevenueReportPage.jsx"));
const PushNotificationCenterPage = lazy(() => import("./features/notifications/pages/PushNotificationCenterPage.jsx"));

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
            <Suspense fallback={<div className="d-flex justify-content-center p-5" role="status">Đang tải trang...</div>}>
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

                {/* UC73 sample reception is a Lab operation, matching queue/status API permissions. */}
                <Route element={<ProtectedRoute allowedRoles={[LAB]} />}>
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
            </Suspense>
            <GlobalIotAlertPopup />
          </Router>
          <NotificationProvider />
        </NotificationContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

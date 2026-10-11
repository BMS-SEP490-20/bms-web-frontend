/**
 * Admin Service
 *
 * Centralizes admin-level operations such as account management and
 * aggregated dashboard statistics. Uses existing services where appropriate
 * so admin pages have a single, stable surface to call.
 */

import { userManagementService } from './userManagementService';
import { patientService } from './patientService';
import { appointmentService } from './appointmentService';
import { labTestService } from './labTestService';
import { invoiceService } from './invoiceService';

const adminService = {
  // Accounts (delegates to userManagementService)
  getAccounts: async (params) => {
    return await userManagementService.getAllUsers();
  },

  createAccount: async (payload) => {
    return await userManagementService.createUser(payload);
  },

  updateAccount: async (id, payload) => {
    return await userManagementService.updateUser(id, payload);
  },

  deleteAccount: async (id) => {
    return await userManagementService.deleteUser(id);
  },

  // Aggregated dashboard stats used by AdminDashboard
  getDashboardStats: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [patientsResult, appointmentsResult, testsResult, revenueResult] = await Promise.all([
        patientService.getAllPatients().catch(() => ({ success: false, data: [] })),
        appointmentService.getAllAppointments().catch(() => ({ success: false, data: [] })),
        labTestService.getAllLabTests().catch(() => ({ success: false, data: [] })),
        invoiceService.getRevenueByDate(today).catch(() => ({ success: false, data: { totalRevenue: 0 } }))
      ]);

      const patients = patientsResult.success ? (Array.isArray(patientsResult.data) ? patientsResult.data : (patientsResult.data?.data || [])) : [];
      const appointments = appointmentsResult.success ? (Array.isArray(appointmentsResult.data) ? appointmentsResult.data : (appointmentsResult.data?.data || [])) : [];
      const tests = testsResult.success ? (Array.isArray(testsResult.data) ? testsResult.data : (testsResult.data?.data || [])) : [];
      const revenue = revenueResult.success ? (revenueResult.data?.totalRevenue || 0) : (revenueResult.data?.totalRevenue || 0);

      const todayAppointments = appointments.filter(apt => apt.appointmentDate === today);
      const pendingTests = tests.filter(t => t.status === 'pending');

      return {
        success: true,
        data: {
          totalPatients: patients.length,
          todayAppointments: todayAppointments.length,
          pendingTests: pendingTests.length,
          todayRevenue: revenue,
          recentAppointments: appointments.slice(0, 5),
          recentTests: tests.slice(0, 5)
        }
      };
    } catch (error) {
      return { success: false, data: { totalPatients: 0, todayAppointments: 0, pendingTests: 0, todayRevenue: 0, recentAppointments: [], recentTests: [] } };
    }
  }
};

export { adminService };

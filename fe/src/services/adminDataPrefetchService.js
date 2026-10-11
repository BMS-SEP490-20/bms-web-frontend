/**
 * Admin Data Prefetch Service
 * 
 * This service prefetches and caches admin data immediately after admin login
 * to improve page load performance when navigating between admin pages.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import { patientService } from './patientService';
import { appointmentService } from './appointmentService';
import { labTestService } from './labTestService';
import { testOrderService } from './testOrderService';
import { invoiceService } from './invoiceService';
import { medicalService } from './medicalService';
import { userManagementService } from './userManagementService';

// Cache storage with TTL (Time To Live)
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes - tăng từ 5 phút để giảm số lần refresh
const cache = {
  patients: { data: null, timestamp: null },
  appointments: { data: null, timestamp: null },
  labTests: { data: null, timestamp: null }, // Keep for backward compatibility
  testResults: { data: null, timestamp: null }, // TestResult entities (actual test results)
  invoices: { data: null, timestamp: null },
  services: { data: null, timestamp: null },
  users: { data: null, timestamp: null }
};

/**
 * Check if cache is valid (not expired)
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
};

/**
 * Get cached data if valid
 */
const getCachedData = (key) => {
  const entry = cache[key];
  if (isCacheValid(entry)) {
    return entry.data;
  }
  return null;
};

/**
 * Set cache data
 */
const setCachedData = (key, data) => {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
};

/**
 * Clear all cache
 */
export const clearAdminCache = () => {
  Object.keys(cache).forEach(key => {
    cache[key] = { data: null, timestamp: null };
  });
};

/**
 * Prefetch all admin data in parallel
 * This is called immediately after admin login
 */
export const prefetchAdminData = async () => {
  try {
    // Prefetch all data in parallel for maximum speed
    const [
      patientsResult,
      appointmentsResult,
      labTestsResult,
      testResultsResult,
      invoicesResult,
      servicesResult,
      usersResult
    ] = await Promise.allSettled([
      patientService.getAllPatients({ fetchAll: true }),
      appointmentService.getAllAppointments({ fetchAll: true }),
      labTestService.getAllLabTests({ fetchAll: true }),
      testOrderService.getAllTestResults({ fetchAll: true }),
      invoiceService.getAllInvoices({ fetchAll: true }),
      medicalService.getAllServices({ fetchAll: true }),
      userManagementService.getAllUsers({ fetchAll: true })
    ]);

    // Cache successful results
    if (patientsResult.status === 'fulfilled' && patientsResult.value?.success) {
      setCachedData('patients', patientsResult.value.data);
    }
    if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value?.success) {
      setCachedData('appointments', appointmentsResult.value.data);
    }
    if (labTestsResult.status === 'fulfilled' && labTestsResult.value?.success) {
      setCachedData('labTests', labTestsResult.value.data);
    }
    if (testResultsResult.status === 'fulfilled' && testResultsResult.value?.success) {
      setCachedData('testResults', testResultsResult.value.data);
    }
    if (invoicesResult.status === 'fulfilled' && invoicesResult.value?.success) {
      setCachedData('invoices', invoicesResult.value.data);
    }
    if (servicesResult.status === 'fulfilled' && servicesResult.value?.success) {
      setCachedData('services', servicesResult.value.data);
    }
    if (usersResult.status === 'fulfilled' && usersResult.value?.success) {
      setCachedData('users', usersResult.value.data);
    }

    return {
      success: true,
      cached: {
        patients: !!getCachedData('patients'),
        appointments: !!getCachedData('appointments'),
        labTests: !!getCachedData('labTests'),
        testResults: !!getCachedData('testResults'),
        invoices: !!getCachedData('invoices'),
        services: !!getCachedData('services'),
        users: !!getCachedData('users')
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get cached or fetch fresh data
 * This is used by admin pages to get data quickly
 */
export const getAdminData = async (dataType, fetchFresh = false) => {
  // If cache is valid and not forcing fresh fetch, return cached data
  if (!fetchFresh) {
    const cached = getCachedData(dataType);
    if (cached !== null) {
      return { success: true, data: cached, fromCache: true };
    }
  }

  // Fetch fresh data
  try {
    let result;
    switch (dataType) {
      case 'patients':
        result = await patientService.getAllPatients({ fetchAll: true });
        break;
      case 'appointments':
        result = await appointmentService.getAllAppointments({ fetchAll: true });
        break;
      case 'labTests':
        result = await labTestService.getAllLabTests({ fetchAll: true });
        break;
      case 'testResults':
        result = await testOrderService.getAllTestResults({ fetchAll: true });
        break;
      case 'invoices':
        result = await invoiceService.getAllInvoices({ fetchAll: true });
        break;
      case 'services':
        result = await medicalService.getAllServices({ fetchAll: true });
        break;
      case 'users':
        result = await userManagementService.getAllUsers({ fetchAll: true });
        break;
      default:
        return { success: false, message: 'Invalid data type' };
    }

    if (result?.success) {
      setCachedData(dataType, result.data);
      return { success: true, data: result.data, fromCache: false };
    }

    return result;
  } catch (error) {
    // If fetch fails, try to return cached data as fallback
    const cached = getCachedData(dataType);
    if (cached !== null) {
      return { success: true, data: cached, fromCache: true, error: error.message };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Prefetch specific data type
 */
export const prefetchDataType = async (dataType) => {
  return await getAdminData(dataType, true);
};


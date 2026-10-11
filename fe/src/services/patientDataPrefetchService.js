/**
 * Patient Data Prefetch Service
 * 
 * This service prefetches and caches patient data immediately after patient login
 * to improve page load performance when navigating between patient pages.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import { patientService } from './patientService';
import { appointmentService } from './appointmentService';
import { medicalService } from './medicalService';
import { invoiceService } from './invoiceService';
import { sampleService } from './sampleService';
import { shiftService } from './shiftService';
import { doctorService } from './doctorService';
import api from './api';

// Cache storage with TTL (Time To Live)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {
  patient: { data: null, timestamp: null },
  appointments: { data: null, timestamp: null },
  services: { data: null, timestamp: null },
  invoices: { data: null, timestamp: null },
  samples: { data: null, timestamp: null },
  shifts: { data: null, timestamp: null },
  doctors: { data: null, timestamp: null },
  doctorRooms: { data: null, timestamp: null }
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
export const clearPatientCache = () => {
  Object.keys(cache).forEach(key => {
    cache[key] = { data: null, timestamp: null };
  });
};

/**
 * Prefetch all patient data in parallel
 * This is called immediately after patient login
 */
export const prefetchPatientData = async (patientEmail) => {
  try {
    if (!patientEmail) {
      return { success: false, error: 'Patient email is required' };
    }

    // Get patient ID first
    const patientResult = await patientService.getPatientByEmail(patientEmail).catch(() => ({ success: false }));
    let patientId = null;
    if (patientResult.success && patientResult.data) {
      patientId = patientResult.data.id || patientResult.data.Id;
      setCachedData('patient', patientResult.data);
    }

    // Prefetch all data in parallel for maximum speed
    const [
      servicesResult,
      doctorsResult,
      doctorRoomsResult,
      shiftsResult,
      samplesResult,
      appointmentsResult,
      invoicesResult
    ] = await Promise.allSettled([
      medicalService.getAllServices({ fetchAll: true }),
      api.get('/gateway/testorder/doctor').catch(() => ({ data: [] })),
      doctorService.getAllDoctorRooms({ page: 1, pageSize: 100 }).catch(() => ({ success: false })),
      shiftService.getAllShifts().catch(() => ({ success: false, data: [] })),
      sampleService.getAllSamples().catch(() => ({ success: false, data: [] })),
      patientId ? appointmentService.getAppointmentsByPatient(patientId).catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] }),
      patientId ? invoiceService.getInvoicesByPatient(patientId).catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] })
    ]);

    // Cache successful results
    if (servicesResult.status === 'fulfilled' && servicesResult.value?.success) {
      setCachedData('services', servicesResult.value.data);
    }
    if (doctorsResult.status === 'fulfilled') {
      const doctorsData = Array.isArray(doctorsResult.value.data) 
        ? doctorsResult.value.data 
        : (doctorsResult.value.data?.data || []);
      setCachedData('doctors', doctorsData);
    }
    if (doctorRoomsResult.status === 'fulfilled' && doctorRoomsResult.value?.success) {
      const roomsData = Array.isArray(doctorRoomsResult.value.data) 
        ? doctorRoomsResult.value.data 
        : [];
      setCachedData('doctorRooms', roomsData);
    }
    if (shiftsResult.status === 'fulfilled' && shiftsResult.value?.success) {
      setCachedData('shifts', shiftsResult.value.data || []);
    }
    if (samplesResult.status === 'fulfilled' && samplesResult.value?.success) {
      setCachedData('samples', samplesResult.value.data || []);
    }
    if (appointmentsResult.status === 'fulfilled' && appointmentsResult.value?.success) {
      setCachedData('appointments', appointmentsResult.value.data || []);
    }
    if (invoicesResult.status === 'fulfilled' && invoicesResult.value?.success) {
      setCachedData('invoices', invoicesResult.value.data || []);
    }

    return {
      success: true,
      cached: {
        patient: !!getCachedData('patient'),
        appointments: !!getCachedData('appointments'),
        services: !!getCachedData('services'),
        invoices: !!getCachedData('invoices'),
        samples: !!getCachedData('samples'),
        shifts: !!getCachedData('shifts'),
        doctors: !!getCachedData('doctors'),
        doctorRooms: !!getCachedData('doctorRooms')
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
 * This is used by patient pages to get data quickly
 */
export const getPatientData = async (dataType, fetchFresh = false, patientId = null) => {
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
      case 'patient':
        // This requires email, handled separately
        return { success: false, message: 'Use getPatientByEmail instead' };
      case 'appointments':
        if (!patientId) {
          return { success: false, message: 'Patient ID is required' };
        }
        result = await appointmentService.getAppointmentsByPatient(patientId);
        break;
      case 'services':
        result = await medicalService.getAllServices({ fetchAll: true });
        break;
      case 'invoices':
        if (!patientId) {
          return { success: false, message: 'Patient ID is required' };
        }
        result = await invoiceService.getInvoicesByPatient(patientId);
        break;
      case 'samples':
        result = await sampleService.getAllSamples();
        break;
      case 'shifts':
        result = await shiftService.getAllShifts();
        break;
      case 'doctors':
        result = await api.get('/gateway/testorder/doctor');
        if (result.data) {
          const doctorsData = Array.isArray(result.data) 
            ? result.data 
            : (result.data?.data || []);
          result = { success: true, data: doctorsData };
        }
        break;
      case 'doctorRooms':
        result = await doctorService.getAllDoctorRooms({ page: 1, pageSize: 100 });
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
 * Get patient by email (with caching)
 */
export const getPatientByEmail = async (email, fetchFresh = false) => {
  if (!fetchFresh) {
    const cached = getCachedData('patient');
    if (cached !== null && cached.email === email) {
      return { success: true, data: cached, fromCache: true };
    }
  }

  try {
    const result = await patientService.getPatientByEmail(email);
    if (result.success && result.data) {
      setCachedData('patient', result.data);
    }
    return result;
  } catch (error) {
    const cached = getCachedData('patient');
    if (cached !== null && cached.email === email) {
      return { success: true, data: cached, fromCache: true, error: error.message };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Prefetch specific data type
 */
export const prefetchPatientDataType = async (dataType, patientId = null) => {
  return await getPatientData(dataType, true, patientId);
};


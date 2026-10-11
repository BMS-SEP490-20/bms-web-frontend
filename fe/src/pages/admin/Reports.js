/**
 * Reports and Analytics Page
 * 
 * Comprehensive reporting and analytics page for the Blood Laboratory Management System.
 * Provides detailed reports, charts, and analytics for business intelligence
 * and operational insights with export and filtering capabilities.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Modal, Table } from 'react-bootstrap';
import { StatusBadge, getStatusLabel, getStatusBadgeColor } from '../../shared/utils/status/statusHelper';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  FaChartBar, 
  FaChartLine, 
  FaChartPie, 
  FaDownload, 
  FaPrint, 
  FaFilter, 
  FaCalendarAlt, 
  FaUsers, 
  FaCalendarCheck, 
  FaFlask, 
  FaDollarSign,
  FaFileAlt,
  FaArrowUp,
  FaClipboardList,
  FaFileExport,
  FaChartArea,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';
import { invoiceService } from '../../services/invoiceService';
import { patientService } from '../../services/patientService';
import useResponsive from '../../shared/hooks/useResponsive';
import { appointmentService } from '../../services/appointmentService';
import { labTestService } from '../../services/labTestService';
import { testOrderService } from '../../services/testOrderService';
import { medicalService } from '../../services/medicalService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import { authService } from '../../services/authService';

const AdminReports = () => {
  const { isMobile, isTablet } = useResponsive();
  const [reportData, setReportData] = useState({
    patients: [],
    appointments: [],
    labTests: [],
    revenue: [],
    services: [] // Add services to store test package data
  });
  const [filters, setFilters] = useState({
    selectedMonth: '',
    reportType: 'monthly'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showRevenueChartModal, setShowRevenueChartModal] = useState(false);
  const [showServiceChartModal, setShowServiceChartModal] = useState(false);
  const [showPatientReportModal, setShowPatientReportModal] = useState(false);
  const [showLabTestReportModal, setShowLabTestReportModal] = useState(false);
  const [showFinancialReportModal, setShowFinancialReportModal] = useState(false);
  const [showSummaryReportModal, setShowSummaryReportModal] = useState(false);

  useEffect(() => {
    // Only allow admin users to access reports
    const user = authService.getCurrentUser();
    const isAdmin = user && (String(user.role || '').toLowerCase().includes('admin') || Number(user.roleId) === 1);
    if (!isAdmin) {
      setError('Bạn không có quyền truy cập báo cáo.');
      return;
    }

    loadReportData();
  }, [filters]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError('');

      // Try to get from cache first for faster loading
      const [patientsCached, appointmentsCached, testResultsCached, revenueCached, servicesCached] = await Promise.all([
        getAdminData('patients', false),
        getAdminData('appointments', false),
        getAdminData('testResults', false),
        getAdminData('invoices', false),
        getAdminData('services', false)
      ]);

      // Use cached data if available, otherwise fetch fresh
      const patientsResult = patientsCached.success && patientsCached.data
        ? { success: true, data: patientsCached.data }
        : await patientService.getAllPatients({ fetchAll: true });
      
      const appointmentsResult = appointmentsCached.success && appointmentsCached.data
        ? { success: true, data: appointmentsCached.data }
        : await appointmentService.getAllAppointments({ fetchAll: true });
      
      // Use testOrderService to get TestResults (actual test results) instead of LabTests (test catalog)
      const labTestsResult = testResultsCached.success && testResultsCached.data
        ? { success: true, data: testResultsCached.data }
        : await testOrderService.getAllTestResults({ fetchAll: true });
      
      const revenueResult = revenueCached.success && revenueCached.data
        ? { success: true, data: revenueCached.data }
        : await invoiceService.getAllInvoices({ fetchAll: true });
      
      const servicesResult = servicesCached.success && servicesCached.data
        ? { success: true, data: servicesCached.data }
        : await medicalService.getAllServices({ fetchAll: true });

      if (patientsResult.success) {
        const patientData = Array.isArray(patientsResult.data) ? patientsResult.data : [];
        setReportData(prev => ({
          ...prev,
          patients: patientData
        }));
      }

      if (appointmentsResult.success) {
        const appointmentData = Array.isArray(appointmentsResult.data) ? appointmentsResult.data : [];
        setReportData(prev => ({
          ...prev,
          appointments: appointmentData
        }));
      }

      if (labTestsResult.success) {
        const labTestData = Array.isArray(labTestsResult.data) ? labTestsResult.data : [];
        setReportData(prev => ({
          ...prev,
          labTests: labTestData
        }));
      }

      if (revenueResult.success) {
        const revenueData = Array.isArray(revenueResult.data) ? revenueResult.data : [];
        setReportData(prev => ({
          ...prev,
          revenue: revenueData
        }));
      }

      if (servicesResult.success) {
        const serviceData = Array.isArray(servicesResult.data) ? servicesResult.data : [];
        setReportData(prev => ({
          ...prev,
          services: serviceData
        }));
      }

    } catch (error) {
      setError('Lỗi tải dữ liệu báo cáo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    let filteredData = {
      patients: reportData.patients || [],
      appointments: reportData.appointments || [],
      labTests: reportData.labTests || [],
      revenue: reportData.revenue || [],
      services: reportData.services || []
    };

    if (filters.selectedMonth) {
      // Filter appointments by month
      filteredData.appointments = (filteredData.appointments || []).filter(apt => 
        apt.appointmentDate && apt.appointmentDate.startsWith(filters.selectedMonth)
      );

      // Filter test results by month (through appointments)
      const appointmentIds = filteredData.appointments.map(apt => apt.id || apt.AppointmentId || apt.appointmentId);
      filteredData.labTests = (filteredData.labTests || []).filter(test => {
        const testAppointmentId = test.appointmentId || test.AppointmentId || test.appointment_id;
        return appointmentIds.some(aptId => 
          String(aptId) === String(testAppointmentId) || 
          aptId === testAppointmentId
        );
      });

      // Filter revenue by month
      filteredData.revenue = (filteredData.revenue || []).filter(inv => 
        inv.invoiceDate && inv.invoiceDate.startsWith(filters.selectedMonth)
      );
    }

    return filteredData;
  };

  // Normalize lab test status (for TestResult entities)
  const normalizeLabTestStatus = (status) => {
    if (!status) return 'pending'; // Default to pending if no status
    const statusLower = String(status).toLowerCase().trim();
    
    // Map various status formats to standard values
    // TestResult statuses: 'Completed', 'Pending', 'waiting_review', 'WaitingReview', etc.
    if (statusLower === 'completed' || statusLower === 'hoàn thành' || statusLower === 'done' || statusLower === 'finished' || statusLower === 'complete') {
      return 'completed';
    }
    // Pending includes: 'pending', 'waiting_review', 'waitingreview', 'chờ xử lý', etc.
    if (statusLower === 'pending' || statusLower === 'waiting_review' || statusLower === 'waitingreview' || 
        statusLower === 'chờ xử lý' || statusLower === 'chờ' || statusLower === 'pendding' || 
        statusLower === 'processing' || statusLower === 'đang xử lý' || statusLower === 'waiting for review') {
      return 'pending';
    }
    if (statusLower === 'approved' || statusLower === 'đã duyệt' || statusLower === 'approve') {
      return 'completed'; // Approved is considered completed
    }
    if (statusLower === 'cancelled' || statusLower === 'đã hủy' || statusLower === 'canceled' || statusLower === 'cancel') {
      return 'cancelled';
    }
    // Handle "UNKNOWN" status - treat as pending for statistics
    if (statusLower === 'unknown' || statusLower === 'n/a' || statusLower === 'na') {
      return 'pending'; // Treat unknown as pending for reporting purposes
    }
    
    // Default to pending for any unrecognized status
    return 'pending';
  };

  // Normalize invoice status
  const normalizeInvoiceStatus = (status) => {
    if (!status) return 'unknown';
    const statusLower = String(status).toLowerCase().trim();
    
    // Map various status formats to standard values
    if (statusLower === 'paid' || statusLower === 'success' || statusLower === 'đã thanh toán' || statusLower === 'thành công') {
      return 'paid';
    }
    if (statusLower === 'pending' || statusLower === 'pendding' || statusLower === 'chờ thanh toán' || statusLower === 'chờ') {
      return 'pending';
    }
    if (statusLower === 'overdue' || statusLower === 'quá hạn') {
      return 'overdue';
    }
    if (statusLower === 'cancelled' || statusLower === 'đã hủy' || statusLower === 'canceled') {
      return 'cancelled';
    }
    
    return statusLower;
  };

  const getReportStats = () => {
    const data = getFilteredData();
    
    const revenue = data.revenue || [];
    const patients = data.patients || [];
    const appointments = data.appointments || [];
    const labTests = data.labTests || [];
    
    const totalRevenue = revenue.reduce((sum, inv) => {
      const amount = Number(inv.totalAmount) || Number(inv.amount) || 0;
      return sum + amount;
    }, 0);
    const totalPatients = patients.length;
    const totalAppointments = appointments.length;
    const totalLabTests = labTests.length;
    
    // Count lab tests by normalized status
    const completedTests = labTests.filter(test => {
      const normalizedStatus = normalizeLabTestStatus(test.status);
      return normalizedStatus === 'completed';
    }).length;
    
    const pendingTests = labTests.filter(test => {
      const normalizedStatus = normalizeLabTestStatus(test.status);
      return normalizedStatus === 'pending';
    }).length;
    
    // Count invoices by normalized status
    const paidInvoices = revenue.filter(inv => {
      const normalizedStatus = normalizeInvoiceStatus(inv.status);
      return normalizedStatus === 'paid';
    }).length;
    
    const pendingInvoices = revenue.filter(inv => {
      const normalizedStatus = normalizeInvoiceStatus(inv.status);
      return normalizedStatus === 'pending';
    }).length;

    return {
      totalRevenue,
      totalPatients,
      totalAppointments,
      totalLabTests,
      completedTests,
      pendingTests,
      paidInvoices,
      pendingInvoices,
      completionRate: totalLabTests > 0 ? (completedTests / totalLabTests * 100).toFixed(1) : 0,
      paymentRate: revenue.length > 0 ? (paidInvoices / revenue.length * 100).toFixed(1) : 0,
      revenue // Add revenue array for use in render
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Calculate revenue by month for chart
  const getRevenueByMonth = () => {
    const data = getFilteredData();
    const revenue = data.revenue || [];
    const monthlyRevenue = {};
    
    revenue.forEach(inv => {
      if (inv.invoiceDate || inv.createdAt) {
        const date = inv.invoiceDate || inv.createdAt;
        const month = date.substring(0, 7); // YYYY-MM
        if (!monthlyRevenue[month]) {
          monthlyRevenue[month] = 0;
        }
        // Ensure amount is converted to number
        const amount = Number(inv.totalAmount || inv.amount || 0);
        monthlyRevenue[month] += amount;
      }
    });
    
    return Object.entries(monthlyRevenue)
      .map(([month, amount]) => ({ 
        month, 
        amount: Number(amount) || 0 // Ensure amount is always a number
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  // Get service name from appointment
  const getAppointmentServiceName = (apt, services = []) => {
    // Try direct fields first (nếu backend đã include tên gói trong appointment)
    const directName = apt.serviceName || apt.ServiceName || 
                      apt.service || apt.Service ||
                      apt.TestPackageName || apt.testPackageName ||
                      apt.packageName || apt.PackageName ||
                      apt.testPackage?.PackageName || apt.testPackage?.packageName ||
                      apt.TestPackage?.PackageName || apt.TestPackage?.packageName;
    if (directName && directName !== 'Chưa xác định' && directName !== 'N/A' && 
        String(directName).trim() !== '' && String(directName).trim() !== 'null' && 
        String(directName).trim() !== 'undefined') {
      return String(directName).trim();
    }
    
    // Try to match with services using TestPackageId
    // Appointment có thể có: TestPackageId, testPackageId, test_package_id, etc.
    const testPackageId = apt.TestPackageId || apt.testPackageId || 
                         apt.test_package_id || apt.Test_Package_Id ||
                         apt.TestPackage?.PackageId || apt.testPackage?.packageId ||
                         apt.TestPackage?.PackageId || apt.testPackage?.PackageId;
    
    if (testPackageId && services.length > 0) {
      // Service (TestPackage) có thể có: PackageId, packageId, id, TestPackageId, etc.
      const service = services.find(s => {
        const sId = s.PackageId || s.packageId || 
                   s.TestPackageId || s.testPackageId || 
                   s.id || s.Id ||
                   s.PACKAGEID || s.package_id;
        // Match với nhiều format: string comparison, case-insensitive
        const testIdStr = String(testPackageId).trim();
        const serviceIdStr = String(sId || '').trim();
        return serviceIdStr !== '' && (
          serviceIdStr === testIdStr ||
          serviceIdStr.toLowerCase() === testIdStr.toLowerCase() ||
          serviceIdStr.toUpperCase() === testIdStr.toUpperCase()
        );
      });
      
      if (service) {
        const serviceName = service.PackageName || service.packageName || 
                           service.name || service.Name ||
                           service.PACKAGENAME || service.package_name;
        if (serviceName && String(serviceName).trim() !== '' && 
            String(serviceName).trim() !== 'null' && 
            String(serviceName).trim() !== 'undefined') {
          return String(serviceName).trim();
        }
      }
    }
    
    // Fallback: Nếu không tìm thấy, trả về tên mặc định dựa trên testPackageId
    if (testPackageId) {
      return `Gói dịch vụ ${testPackageId}`;
    }
    
    return 'Chưa xác định';
  };

  // Calculate service distribution
  const getServiceDistribution = () => {
    const data = getFilteredData();
    const appointments = data.appointments || [];
    const services = data.services || [];
    const serviceCount = {};
    
    // Debug: Log để kiểm tra dữ liệu
    if (appointments.length > 0 && services.length === 0) {
      // Nếu không có services, vẫn cố gắng group theo testPackageId
      appointments.forEach(apt => {
        const testPackageId = apt.TestPackageId || apt.testPackageId || 
                             apt.test_package_id || apt.Test_Package_Id ||
                             apt.TestPackage?.PackageId || apt.testPackage?.packageId;
        const serviceName = testPackageId ? `Gói ${testPackageId}` : 'Chưa xác định';
        serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
      });
    } else {
      // Normal flow: sử dụng getAppointmentServiceName
      appointments.forEach(apt => {
        const serviceName = getAppointmentServiceName(apt, services);
        serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
      });
    }
    
    const total = appointments.length;
    const distribution = Object.entries(serviceCount)
      .map(([service, count]) => ({
        service,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    return distribution;
  };

  // Get patient report data
  const getPatientReportData = () => {
    const data = getFilteredData();
    const patients = data.patients || [];
    
    const byGender = {
      male: patients.filter(p => p.gender === 'male' || p.gender === 'Nam').length,
      female: patients.filter(p => p.gender === 'female' || p.gender === 'Nữ').length,
      other: patients.filter(p => !['male', 'female', 'Nam', 'Nữ'].includes(p.gender)).length
    };
    
    const byAgeGroup = {
      '0-18': 0,
      '19-30': 0,
      '31-50': 0,
      '51-70': 0,
      '70+': 0
    };
    
    patients.forEach(patient => {
      if (patient.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
        if (age <= 18) byAgeGroup['0-18']++;
        else if (age <= 30) byAgeGroup['19-30']++;
        else if (age <= 50) byAgeGroup['31-50']++;
        else if (age <= 70) byAgeGroup['51-70']++;
        else byAgeGroup['70+']++;
      }
    });
    
    return {
      total: patients.length,
      byGender,
      byAgeGroup,
      patients: patients.slice(0, 50) // Limit to first 50 for display
    };
  };

  // Get test package/service name from lab test
  const getTestPackageName = (test, appointments = [], services = []) => {
    // Try to get from test directly first - check all possible field names
    const directName = test.testPackage || test.testType || test.TestType || 
                      test.packageName || test.PackageName || 
                      test.serviceName || test.ServiceName ||
                      test.testPackageName || test.TestPackageName ||
                      test.PackageName || test.packageName ||
                      test.service?.name || test.service?.packageName ||
                      test.Service?.Name || test.Service?.PackageName ||
                      test.testPackage?.name || test.testPackage?.packageName ||
                      test.TestPackage?.Name || test.TestPackage?.PackageName;
    
    if (directName && directName !== 'N/A' && directName !== 'Chưa xác định' && 
        String(directName).trim() !== '' && String(directName).trim() !== 'null' && 
        String(directName).trim() !== 'undefined') {
      return String(directName).trim();
    }
    
    // Try to get from appointment - check all possible appointmentId field names
    const appointmentId = test.appointmentId || test.AppointmentId || test.appointment_id ||
                         test.appointment?.id || test.appointment?.appointmentId ||
                         test.Appointment?.Id || test.Appointment?.AppointmentId ||
                         test.sample?.appointmentId || test.Sample?.AppointmentId;
    
    if (appointmentId && appointments.length > 0) {
      // Try to find appointment by matching ID in various formats
      const appointment = appointments.find(apt => {
        const aptId = apt.id || apt.Id || apt.appointmentId || apt.AppointmentId ||
                     apt.appointment_id || apt.appointmentId;
        return String(aptId) === String(appointmentId);
      });
      
      if (appointment) {
        // Use the same logic as getAppointmentServiceName
        const serviceName = getAppointmentServiceName(appointment, services);
        if (serviceName && serviceName !== 'Chưa xác định' && serviceName !== 'N/A' && 
            String(serviceName).trim() !== '' && String(serviceName).trim() !== 'null') {
          return String(serviceName).trim();
        }
      }
    }
    
    // Try to match by patientId and date if appointmentId not found
    const testPatientId = test.patientId || test.PatientId || test.patient_id ||
                         test.patient?.id || test.Patient?.Id;
    const testDate = test.requestedAt || test.createdAt || test.CreatedAt || test.requested_at ||
                    test.sampleDate || test.SampleDate;
    
    if (testPatientId && testDate && appointments.length > 0) {
      try {
        // Try to find appointment by patientId and date
        const testDateObj = new Date(testDate);
        if (!isNaN(testDateObj.getTime())) {
          const testDateStr = testDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          const appointment = appointments.find(apt => {
            const aptPatientId = apt.patientId || apt.PatientId || apt.patient_id ||
                                apt.patient?.id || apt.Patient?.Id;
            const aptDate = apt.appointmentDate || apt.AppointmentDate || apt.appointment_date;
            if (aptDate) {
              try {
                const aptDateObj = new Date(aptDate);
                if (!isNaN(aptDateObj.getTime())) {
                  const aptDateStr = aptDateObj.toISOString().split('T')[0];
                  return String(aptPatientId) === String(testPatientId) && aptDateStr === testDateStr;
                }
              } catch (e) {
                // Ignore date parsing errors
              }
            }
            return false;
          });
          
          if (appointment) {
            const serviceName = getAppointmentServiceName(appointment, services);
            if (serviceName && serviceName !== 'Chưa xác định' && serviceName !== 'N/A' && 
                String(serviceName).trim() !== '' && String(serviceName).trim() !== 'null') {
              return String(serviceName).trim();
            }
          }
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }
    
    // Final fallback: try to get from testPackageId if available
    const testPackageId = test.testPackageId || test.TestPackageId || test.test_package_id ||
                         test.packageId || test.PackageId ||
                         test.testPackage?.id || test.TestPackage?.Id ||
                         test.package?.id || test.Package?.Id;
    
    if (testPackageId && services.length > 0) {
      const service = services.find(s => {
        const sId = s.PackageId || s.packageId || 
                   s.TestPackageId || s.testPackageId || 
                   s.id || s.Id;
        return String(sId) === String(testPackageId);
      });
      
      if (service) {
        const serviceName = service.PackageName || service.packageName || service.name || service.Name;
        if (serviceName && String(serviceName).trim() !== '' && String(serviceName).trim() !== 'null') {
          return String(serviceName).trim();
        }
      }
    }
    
    // Last resort: try to find any appointment for this patient and use its service
    if (testPatientId && appointments.length > 0 && services.length > 0) {
      // Find the most recent appointment for this patient
      const patientAppointments = appointments
        .filter(apt => {
          const aptPatientId = apt.patientId || apt.PatientId || apt.patient_id ||
                              apt.patient?.id || apt.Patient?.Id;
          return String(aptPatientId) === String(testPatientId);
        })
        .sort((a, b) => {
          const dateA = new Date(a.appointmentDate || a.AppointmentDate || a.createdAt || 0);
          const dateB = new Date(b.appointmentDate || b.AppointmentDate || b.createdAt || 0);
          return dateB - dateA; // Most recent first
        });
      
      if (patientAppointments.length > 0) {
        const recentAppointment = patientAppointments[0];
        const serviceName = getAppointmentServiceName(recentAppointment, services);
        if (serviceName && serviceName !== 'Chưa xác định' && serviceName !== 'N/A' && 
            String(serviceName).trim() !== '' && String(serviceName).trim() !== 'null') {
          return String(serviceName).trim();
        }
      }
    }
    
    return 'N/A';
  };

  // Get lab test report data
  const getLabTestReportData = () => {
    const data = getFilteredData();
    const labTests = data.labTests || [];
    const appointments = data.appointments || [];
    const services = data.services || [];
    
    // Normalize status field for each lab test
    const normalizedTests = labTests.map(test => {
      const status = (test.status || test.Status || test.status_code || '').toLowerCase().trim();
      const normalizedStatus = normalizeLabTestStatus(status || 'unknown');
      const testPackageName = getTestPackageName(test, appointments, services);
      
      return {
        ...test,
        normalizedStatus,
        testPackageName
      };
    });
    
    const byStatus = {
      pending: normalizedTests.filter(t => {
        const s = t.normalizedStatus;
        return s === 'pending' || s === 'chờ xử lý' || s === 'pending_processing';
      }).length,
      completed: normalizedTests.filter(t => {
        const s = t.normalizedStatus;
        return s === 'completed' || s === 'hoàn thành' || s === 'done';
      }).length,
      waiting_review: normalizedTests.filter(t => {
        const s = t.normalizedStatus;
        return s === 'waiting_review' || s === 'chờ duyệt' || s === 'pending_review';
      }).length,
      approved: normalizedTests.filter(t => {
        const s = t.normalizedStatus;
        return s === 'approved' || s === 'đã duyệt' || s === 'approved';
      }).length
    };
    
    return {
      total: normalizedTests.length,
      byStatus,
      labTests: normalizedTests.slice(0, 50) // Limit to first 50 for display
    };
  };

  // Get financial report data
  const getFinancialReportData = () => {
    const data = getFilteredData();
    const revenue = data.revenue || [];
    
    const totalRevenue = revenue.reduce((sum, inv) => {
      const amount = Number(inv.totalAmount) || Number(inv.amount) || 0;
      return sum + amount;
    }, 0);
    
    const paidRevenue = revenue
      .filter(inv => {
        const normalizedStatus = normalizeInvoiceStatus(inv.status);
        return normalizedStatus === 'paid';
      })
      .reduce((sum, inv) => {
        const amount = Number(inv.totalAmount) || Number(inv.amount) || 0;
        return sum + amount;
      }, 0);
    
    const pendingRevenue = revenue
      .filter(inv => {
        const normalizedStatus = normalizeInvoiceStatus(inv.status);
        return normalizedStatus === 'pending';
      })
      .reduce((sum, inv) => {
        const amount = Number(inv.totalAmount) || Number(inv.amount) || 0;
        return sum + amount;
      }, 0);
    
    const paidInvoices = revenue.filter(inv => {
      const normalizedStatus = normalizeInvoiceStatus(inv.status);
      return normalizedStatus === 'paid';
    }).length;
    
    const pendingInvoices = revenue.filter(inv => {
      const normalizedStatus = normalizeInvoiceStatus(inv.status);
      return normalizedStatus === 'pending';
    }).length;
    
    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      totalInvoices: revenue.length,
      paidInvoices,
      pendingInvoices,
      invoices: revenue.slice(0, 50) // Limit to first 50 for display
    };
  };

  const stats = getReportStats();

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const data = getFilteredData();
      const stats = getReportStats();
      const revenueData = getRevenueByMonth();
      const serviceDist = getServiceDistribution();
      const labTestData = getLabTestReportData();
      const financialData = getFinancialReportData();
      
      // Prepare CSV content
      const headers = [
        'BÁO CÁO TỔNG QUAN',
        '',
        '',
        '',
        ''
      ];
      
      const summaryRows = [
        ['Tổng doanh thu', formatCurrency(stats.totalRevenue)],
        ['Tổng bệnh nhân', stats.totalPatients],
        ['Tổng lịch hẹn', stats.totalAppointments],
        ['Tổng xét nghiệm', stats.totalLabTests],
        ['Xét nghiệm hoàn thành', stats.completedTests],
        ['Xét nghiệm chờ xử lý', stats.pendingTests],
        ['Hóa đơn đã thanh toán', stats.paidInvoices],
        ['Hóa đơn chờ thanh toán', stats.pendingInvoices],
        ['Tỷ lệ hoàn thành xét nghiệm', `${stats.completionRate}%`],
        ['Tỷ lệ thanh toán', `${stats.paymentRate}%`]
      ];
      
      const revenueRows = [
        [''],
        ['DOANH THU THEO THÁNG'],
        ['Tháng', 'Doanh thu']
      ];
      revenueData.forEach(item => {
        revenueRows.push([item.month, formatCurrency(item.amount)]);
      });
      
      const serviceRows = [
        [''],
        ['PHÂN BỔ DỊCH VỤ'],
        ['Dịch vụ', 'Số lượng', 'Tỷ lệ']
      ];
      serviceDist.forEach(item => {
        serviceRows.push([item.service, item.count, `${item.percentage}%`]);
      });
      
      const labTestRows = [
        [''],
        ['CHI TIẾT XÉT NGHIỆM'],
        ['STT', 'Mã xét nghiệm', 'Loại xét nghiệm', 'Trạng thái', 'Ngày tạo']
      ];
      labTestData.labTests.forEach((test, idx) => {
        const testStatus = test.normalizedStatus || test.status || 'unknown';
        labTestRows.push([
          idx + 1,
          `XN${String(test.id || test.testId || '').slice(-6)}`,
          test.testPackageName || 'N/A',
          getStatusLabel(testStatus),
          formatDate(test.createdAt || test.CreatedAt || test.created_at)
        ]);
      });
      
      // Combine all rows
      const allRows = [
        headers,
        ...summaryRows,
        ...revenueRows,
        ...serviceRows,
        ...labTestRows
      ];
      
      // Convert to CSV
      const csvContent = allRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Add BOM for Excel UTF-8 support
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bao-cao-thong-ke-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('Đã xuất báo cáo Excel thành công!');
    } catch (error) {
      setError('Lỗi xuất báo cáo Excel: ' + error.message);
    }
  };

  // Print Report
  const handlePrintReport = () => {
    try {
      const data = getFilteredData();
      const stats = getReportStats();
      const revenueData = getRevenueByMonth();
      const serviceDist = getServiceDistribution();
      const labTestData = getLabTestReportData();
      const financialData = getFinancialReportData();
      
      const printWindow = window.open('', '_blank');
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Báo cáo thống kê</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            h1 { 
              text-align: center; 
              color: #1e40af; 
              margin-bottom: 10px; 
            }
            .subtitle {
              text-align: center;
              color: #6c757d;
              margin-bottom: 30px;
            }
            .info { 
              margin-bottom: 20px; 
              text-align: center; 
              color: #6c757d; 
            }
            .section {
              margin-top: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 15px;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
              margin-bottom: 20px;
            }
            th, td { 
              border: 1px solid #dee2e6; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
              text-align: center;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-item {
              padding: 15px;
              border: 1px solid #dee2e6;
              border-radius: 5px;
              background-color: #f8f9fa;
            }
            .summary-label {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 20px;
              font-weight: bold;
              color: #1e40af;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 10px; 
              color: #6c757d; 
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>BÁO CÁO THỐNG KÊ</h1>
          <div class="subtitle">Phòng Xét Nghiệm Máu - Hệ thống quản lý y tế</div>
          <div class="info">
            <p>Ngày in: ${formatDate(new Date().toISOString())}</p>
            ${filters.selectedMonth ? `<p>Tháng: ${filters.selectedMonth}</p>` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">TỔNG QUAN</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Tổng doanh thu</div>
                <div class="summary-value">${formatCurrency(stats.totalRevenue)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Tổng bệnh nhân</div>
                <div class="summary-value">${stats.totalPatients}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Tổng lịch hẹn</div>
                <div class="summary-value">${stats.totalAppointments}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Tổng xét nghiệm</div>
                <div class="summary-value">${stats.totalLabTests}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Xét nghiệm hoàn thành</div>
                <div class="summary-value">${stats.completedTests} (${stats.completionRate}%)</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Hóa đơn đã thanh toán</div>
                <div class="summary-value">${stats.paidInvoices} (${stats.paymentRate}%)</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">DOANH THU THEO THÁNG</div>
            <table>
              <thead>
                <tr>
                  <th class="text-center">Tháng</th>
                  <th class="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${revenueData.length > 0 ? revenueData.map(item => `
                  <tr>
                    <td class="text-center">${item.month}</td>
                    <td class="text-right">${formatCurrency(item.amount)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="2" class="text-center">Không có dữ liệu</td></tr>'}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">PHÂN BỔ DỊCH VỤ</div>
            <table>
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th class="text-center">Số lượng</th>
                  <th class="text-center">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                ${serviceDist.length > 0 ? serviceDist.map(item => `
                  <tr>
                    <td>${item.service}</td>
                    <td class="text-center">${item.count}</td>
                    <td class="text-center">${item.percentage}%</td>
                  </tr>
                `).join('') : '<tr><td colspan="3" class="text-center">Không có dữ liệu</td></tr>'}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">CHI TIẾT XÉT NGHIỆM (${labTestData.labTests.length} đầu tiên)</div>
            <table>
              <thead>
                <tr>
                  <th class="text-center">STT</th>
                  <th class="text-center">Mã xét nghiệm</th>
                  <th>Loại xét nghiệm</th>
                  <th class="text-center">Trạng thái</th>
                  <th class="text-center">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                ${labTestData.labTests.length > 0 ? labTestData.labTests.map((test, idx) => {
                  const testStatus = test.normalizedStatus || test.status || 'unknown';
                  return `
                    <tr>
                      <td class="text-center">${idx + 1}</td>
                      <td class="text-center">XN${String(test.id || test.testId || '').slice(-6)}</td>
                      <td>${test.testPackageName || 'N/A'}</td>
                      <td class="text-center">${getStatusLabel(testStatus)}</td>
                      <td class="text-center">${formatDate(test.createdAt || test.CreatedAt || test.created_at)}</td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" class="text-center">Không có dữ liệu</td></tr>'}
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>Phòng Xét Nghiệm Máu - Hệ thống quản lý y tế</p>
            <p>Báo cáo được tạo tự động từ hệ thống</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
      
      setSuccess('Đã mở cửa sổ in báo cáo!');
    } catch (error) {
      setError('Lỗi in báo cáo: ' + error.message);
    }
  };

  // Export to PDF (using print to PDF)
  const handleExportPDF = () => {
    // For now, we'll use the print function which can be saved as PDF
    // In a production environment, you might want to use a library like jsPDF or html2pdf
    handlePrintReport();
    setSuccess('Vui lòng chọn "Lưu dưới dạng PDF" trong hộp thoại in để xuất PDF!');
  };

  return (
    <Container fluid className="py-4" style={{ 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h2 className="mb-1 text-primary" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
                <FaChartBar className="me-2" />
                Báo cáo thống kê
              </h2>
              <p className="text-muted mb-0 d-none d-md-block">Báo cáo tổng quan và thống kê hoạt động phòng xét nghiệm</p>
            </div>
            <div className="d-flex gap-2 w-100 w-md-auto flex-wrap">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleExportPDF}
                disabled={loading}
                className="flex-fill flex-md-grow-0"
              >
                <FaFileExport className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">Xuất PDF</span>
                <span className="d-sm-none">PDF</span>
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleExportExcel}
                disabled={loading}
                className="flex-fill flex-md-grow-0"
              >
                <FaDownload className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">Xuất Excel</span>
                <span className="d-sm-none">Excel</span>
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handlePrintReport}
                disabled={loading}
                className="flex-fill flex-md-grow-0"
              >
                <FaPrint className="me-1 me-md-2" />
                <span className="d-none d-sm-inline">In báo cáo</span>
                <span className="d-sm-none">In</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaChartBar className="me-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <FaChartBar className="me-2" />
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <FaCalendarAlt className="me-2 text-primary" />
                  Lọc theo tháng
                </Form.Label>
                <Form.Control
                  type="month"
                  value={filters.selectedMonth}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    selectedMonth: e.target.value
                  }))}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <FaFilter className="me-2 text-primary" />
                  Loại báo cáo
                </Form.Label>
                <Form.Select
                  value={filters.reportType}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    reportType: e.target.value
                  }))}
                >
                  <option value="monthly">Báo cáo tháng</option>
                  <option value="quarterly">Báo cáo quý</option>
                  <option value="yearly">Báo cáo năm</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button
                variant="outline-primary"
                onClick={() => setFilters({ selectedMonth: '', reportType: 'monthly' })}
                className="w-100"
              >
                <FaFilter className="me-2" />
                Làm mới
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Main Stats */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon stat-icon-success mb-2">
                <FaDollarSign />
              </div>
              <h4 className="stat-value" style={{ color: 'white', fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>{formatCurrency(stats.totalRevenue)}</h4>
              <p className="stat-title" style={{ color: 'white', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Tổng doanh thu</p>
              <Badge bg="success" className="mt-2" style={{ color: 'white' }}>
                <FaArrowUp className="me-1" />
                +12.5%
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon stat-icon-primary mb-2">
                <FaUsers />
              </div>
              <h4 className="stat-value" style={{ color: 'white', fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>{stats.totalPatients}</h4>
              <p className="stat-title" style={{ color: 'white', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Tổng bệnh nhân</p>
              <Badge bg="primary" className="mt-2" style={{ color: 'white' }}>
                <FaArrowUp className="me-1" />
                +8.2%
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon stat-icon-info mb-2">
                <FaCalendarCheck />
              </div>
              <h4 className="stat-value" style={{ color: 'white', fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>{stats.totalAppointments}</h4>
              <p className="stat-title" style={{ color: 'white', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Tổng lịch hẹn</p>
              <Badge bg="info" className="mt-2" style={{ color: 'white' }}>
                <FaArrowUp className="me-1" />
                +15.3%
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body className="text-center">
              <div className="stat-icon stat-icon-warning mb-2">
                <FaFlask />
              </div>
              <h4 className="stat-value" style={{ color: 'white', fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>{stats.totalLabTests}</h4>
              <p className="stat-title" style={{ color: 'white', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Tổng xét nghiệm</p>
              <Badge bg="warning" className="mt-2" style={{ color: 'white' }}>
                <FaArrowUp className="me-1" />
                +6.7%
              </Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Stats */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaChartPie className="me-2" />
                Thống kê xét nghiệm
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="text-center mb-3">
                  <div className="stat-icon stat-icon-success mb-2 mx-auto">
                    <FaCheckCircle />
                  </div>
                  <h4 className="stat-value">{stats.completedTests}</h4>
                  <p className="stat-title">Hoàn thành</p>
                  <Badge bg="success">{stats.completionRate}%</Badge>
                </Col>
                <Col md={6} className="text-center mb-3">
                  <div className="stat-icon stat-icon-warning mb-2 mx-auto">
                    <FaClock />
                  </div>
                  <h4 className="stat-value">{stats.pendingTests}</h4>
                  <p className="stat-title">Chờ xử lý</p>
                  <Badge bg="warning">
                    {stats.totalLabTests > 0 ? 
                      ((stats.pendingTests / stats.totalLabTests) * 100).toFixed(1) : 0}%
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <FaDollarSign className="me-2" />
                Thống kê thanh toán
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="text-center mb-3">
                  <div className="stat-icon stat-icon-success mb-2 mx-auto">
                    <FaCheckCircle />
                  </div>
                  <h4 className="stat-value">{stats.paidInvoices}</h4>
                  <p className="stat-title">Đã thanh toán</p>
                  <Badge bg="success">{stats.paymentRate}%</Badge>
                </Col>
                <Col md={6} className="text-center mb-3">
                  <div className="stat-icon stat-icon-warning mb-2 mx-auto">
                    <FaClock />
                  </div>
                  <h4 className="stat-value">{stats.pendingInvoices}</h4>
                  <p className="stat-title">Chờ thanh toán</p>
                  <Badge bg="warning">
                    {stats.revenue && stats.revenue.length > 0 ? 
                      ((stats.pendingInvoices / stats.revenue.length) * 100).toFixed(1) : 0}%
                  </Badge>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row>
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <FaChartLine className="me-2" />
                <span className="d-none d-sm-inline">Biểu đồ doanh thu theo tháng</span>
                <span className="d-sm-none">Doanh thu</span>
              </h5>
              <Button variant="light" size="sm" onClick={() => setShowRevenueChartModal(true)}>
                <FaChartLine className="me-1" />
                <span className="d-none d-sm-inline">Chi tiết</span>
                <span className="d-sm-none">...</span>
              </Button>
            </Card.Header>
            <Card.Body>
              {(() => {
                const revenueData = getRevenueByMonth();
                if (revenueData.length === 0) {
                  return (
                    <div className="text-center py-5">
                      <FaChartArea className="text-muted mb-3" style={{fontSize: '3rem'}} />
                      <h5 className="text-muted">Chưa có dữ liệu</h5>
                      <p className="text-muted">Dữ liệu biểu đồ sẽ được hiển thị ở đây khi có doanh thu</p>
                    </div>
                  );
                }
                
                // Ensure all amounts are numbers and format for chart
                const chartData = revenueData.map(item => ({
                  month: new Date(item.month + '-01').toLocaleDateString('vi-VN', { month: 'short' }),
                  fullMonth: item.month,
                  amount: Number(item.amount) || 0,
                  formatted: formatCurrency(Number(item.amount) || 0)
                }));
                
                return (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6c757d"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6c757d"
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value;
                          }}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) => `Tháng ${label}`}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '10px'
                          }}
                        />
                        <Bar 
                          dataKey="amount" 
                          fill="#0d6efd" 
                          radius={[8, 8, 0, 0]}
                          name="Doanh thu"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 text-center">
                      <small className="text-muted">
                        Tổng doanh thu: <strong>{formatCurrency(chartData.reduce((sum, item) => sum + item.amount, 0))}</strong>
                      </small>
                    </div>
                  </>
                );
              })()}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-warning text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                <FaChartPie className="me-2" />
                <span className="d-none d-sm-inline">Phân bổ dịch vụ</span>
                <span className="d-sm-none">Dịch vụ</span>
              </h5>
              <Button variant="light" size="sm" onClick={() => setShowServiceChartModal(true)}>
                <FaChartPie className="me-1" />
                <span className="d-none d-sm-inline">Chi tiết</span>
                <span className="d-sm-none">...</span>
              </Button>
            </Card.Header>
            <Card.Body>
              {(() => {
                const serviceData = getServiceDistribution();
                if (serviceData.length === 0) {
                  return (
                    <div className="text-center py-5">
                      <FaChartPie className="text-muted mb-3" style={{fontSize: '3rem'}} />
                      <h5 className="text-muted">Chưa có dữ liệu</h5>
                      <p className="text-muted">Phân bổ dịch vụ sẽ được hiển thị ở đây khi có lịch hẹn</p>
                    </div>
                  );
                }
                
                const COLORS = ['#ffc107', '#fd7e14', '#20c997', '#0dcaf0', '#6610f2', '#e83e8c', '#198754', '#dc3545', '#6c757d', '#0d6efd'];
                
                // Format data for pie chart
                const pieData = serviceData.map((item, idx) => ({
                  name: item.service.length > 15 ? item.service.substring(0, 15) + '...' : item.service,
                  fullName: item.service,
                  value: item.count,
                  percentage: item.percentage,
                  color: COLORS[idx % COLORS.length]
                }));
                
                const CustomTooltip = ({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.fullName}</p>
                        <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                          Số lượng: <strong>{payload[0].value}</strong>
                        </p>
                        <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                          Tỷ lệ: <strong>{payload[0].payload.percentage}%</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                };
                
                return (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percentage }) => `${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3">
                      {pieData.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="d-flex align-items-center mb-2">
                          <span 
                            style={{ 
                              display: 'inline-block', 
                              width: '12px', 
                              height: '12px', 
                              backgroundColor: item.color,
                              marginRight: '8px',
                              borderRadius: '2px'
                            }}
                          />
                          <small className="flex-grow-1" style={{ fontSize: '0.85rem' }}>
                            {item.fullName.length > 20 ? item.fullName.substring(0, 20) + '...' : item.fullName}
                          </small>
                          <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                            {item.percentage}%
                          </Badge>
                        </div>
                      ))}
                      {pieData.length > 5 && (
                        <div className="text-center mt-2">
                          <small className="text-muted">
                            +{pieData.length - 5} dịch vụ khác
                          </small>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <FaClipboardList className="me-2" />
                Báo cáo nhanh
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-3">
                  <Button 
                    variant="outline-primary" 
                    className="w-100 h-100 py-3"
                    onClick={() => setShowPatientReportModal(true)}
                  >
                    <FaFileAlt className="mb-2" style={{fontSize: '1.5rem'}} />
                    <div>Báo cáo bệnh nhân</div>
                  </Button>
                </Col>
                <Col md={3} className="mb-3">
                  <Button 
                    variant="outline-success" 
                    className="w-100 h-100 py-3"
                    onClick={() => setShowLabTestReportModal(true)}
                  >
                    <FaFlask className="mb-2" style={{fontSize: '1.5rem'}} />
                    <div>Báo cáo xét nghiệm</div>
                  </Button>
                </Col>
                <Col md={3} className="mb-3">
                  <Button 
                    variant="outline-info" 
                    className="w-100 h-100 py-3"
                    onClick={() => setShowFinancialReportModal(true)}
                  >
                    <FaDollarSign className="mb-2" style={{fontSize: '1.5rem'}} />
                    <div>Báo cáo tài chính</div>
                  </Button>
                </Col>
                <Col md={3} className="mb-3">
                  <Button 
                    variant="outline-warning" 
                    className="w-100 h-100 py-3"
                    onClick={() => setShowSummaryReportModal(true)}
                  >
                    <FaChartBar className="mb-2" style={{fontSize: '1.5rem'}} />
                    <div>Báo cáo tổng hợp</div>
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Chart Modal */}
      <Modal show={showRevenueChartModal} onHide={() => setShowRevenueChartModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FaChartLine className="me-2" />
            Biểu đồ doanh thu theo tháng
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <h5 className="mb-3">Tổng quan</h5>
            <Row>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <h6 className="text-muted">Tổng doanh thu</h6>
                    <h4 className="text-primary">{formatCurrency(stats.totalRevenue)}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <h6 className="text-muted">Số hóa đơn</h6>
                    <h4 className="text-success">{stats.revenue?.length || 0}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
          
          <div className="mb-4">
            <h5 className="mb-3">Doanh thu theo tháng</h5>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th className="text-end">Doanh thu</th>
                  <th className="text-end">Số hóa đơn</th>
                </tr>
              </thead>
              <tbody>
                {getRevenueByMonth().map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.month}</td>
                    <td className="text-end">{formatCurrency(item.amount)}</td>
                    <td className="text-end">
                      {stats.revenue?.filter(inv => 
                        (inv.invoiceDate || inv.createdAt || '').startsWith(item.month)
                      ).length || 0}
                    </td>
                  </tr>
                ))}
                {getRevenueByMonth().length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Bar chart visualization */}
          <div className="mb-3">
            <h5 className="mb-3">Biểu đồ cột</h5>
            {(() => {
              const revenueData = getRevenueByMonth();
              if (revenueData.length === 0) {
                return (
                  <div className="w-100 text-center text-muted py-5">Không có dữ liệu để hiển thị</div>
                );
              }
              
              // Format data for chart
              const chartData = revenueData.map(item => ({
                month: new Date(item.month + '-01').toLocaleDateString('vi-VN', { month: 'short' }),
                fullMonth: item.month,
                amount: Number(item.amount) || 0
              }));
              
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6c757d"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6c757d"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(label) => `Tháng ${label}`}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '10px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="amount" 
                      fill="#0d6efd" 
                      radius={[8, 8, 0, 0]}
                      name="Doanh thu"
                    />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevenueChartModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Service Distribution Chart Modal */}
      <Modal show={showServiceChartModal} onHide={() => setShowServiceChartModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title>
            <FaChartPie className="me-2" />
            Phân bổ dịch vụ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <h5 className="mb-3">Tổng quan</h5>
            <Row>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <h6 className="text-muted">Tổng số lịch hẹn</h6>
                    <h4 className="text-primary">{stats.totalAppointments}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <h6 className="text-muted">Số loại dịch vụ</h6>
                    <h4 className="text-success">{getServiceDistribution().length}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          <div className="mb-4">
            <h5 className="mb-3">Chi tiết phân bổ</h5>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th className="text-center">Số lượng</th>
                  <th className="text-center">Tỷ lệ</th>
                  <th>Biểu đồ</th>
                </tr>
              </thead>
              <tbody>
                {getServiceDistribution().map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.service}</strong></td>
                    <td className="text-center">{item.count}</td>
                    <td className="text-center">{item.percentage}%</td>
                    <td>
                      <div style={{ width: '100%', height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${item.percentage}%`, 
                            height: '100%', 
                            backgroundColor: idx % 2 === 0 ? '#ffc107' : '#fd7e14',
                            transition: 'width 0.3s'
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {getServiceDistribution().length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pie chart visualization */}
          <div className="mb-3">
            <h5 className="mb-3">Biểu đồ tròn</h5>
            {(() => {
              const serviceData = getServiceDistribution();
              if (serviceData.length === 0) {
                return (
                  <div className="w-100 text-center text-muted py-5">Không có dữ liệu</div>
                );
              }
              
              const COLORS = ['#ffc107', '#fd7e14', '#20c997', '#0dcaf0', '#6610f2', '#e83e8c', '#198754', '#dc3545', '#6c757d', '#0d6efd'];
              
              // Format data for pie chart
              const pieData = serviceData.map((item, idx) => ({
                name: item.service.length > 15 ? item.service.substring(0, 15) + '...' : item.service,
                fullName: item.service,
                value: item.count,
                percentage: item.percentage,
                color: COLORS[idx % COLORS.length]
              }));
              
              const CustomTooltip = ({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.fullName}</p>
                      <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                        Số lượng: <strong>{payload[0].value}</strong>
                      </p>
                      <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                        Tỷ lệ: <strong>{payload[0].payload.percentage}%</strong>
                      </p>
                    </div>
                  );
                }
                return null;
              };
              
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      formatter={(value, entry) => `${entry.payload.fullName} (${entry.payload.percentage}%)`}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowServiceChartModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Patient Report Modal */}
      <Modal show={showPatientReportModal} onHide={() => setShowPatientReportModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaUsers className="me-2" />
            Báo cáo bệnh nhân
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const patientData = getPatientReportData();
            return (
              <>
                <Row className="mb-4">
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Tổng số bệnh nhân</h6>
                        <h3 className="text-primary">{patientData.total}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Nam</h6>
                        <h3 className="text-info">{patientData.byGender.male}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Nữ</h6>
                        <h3 className="text-danger">{patientData.byGender.female}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <div className="mb-4">
                      <h5 className="mb-3">Phân bổ theo giới tính</h5>
                      {(() => {
                        const genderData = [
                          { name: 'Nam', value: patientData.byGender.male, color: '#0dcaf0' },
                          { name: 'Nữ', value: patientData.byGender.female, color: '#e83e8c' },
                          { name: 'Khác', value: patientData.byGender.other, color: '#6c757d' }
                        ].filter(item => item.value > 0);
                        
                        if (genderData.length === 0) {
                          return <p className="text-muted text-center">Không có dữ liệu</p>;
                        }
                        
                        const CustomTooltip = ({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const total = genderData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Số lượng: <strong>{payload[0].value}</strong>
                                </p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Tỷ lệ: <strong>{percentage}%</strong>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        };
                        
                        return (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={genderData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => {
                                  const total = genderData.reduce((sum, item) => sum + item.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return `${name}: ${percentage}%`;
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {genderData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-4">
                      <h5 className="mb-3">Phân bổ theo độ tuổi</h5>
                      {(() => {
                        const ageData = Object.entries(patientData.byAgeGroup)
                          .map(([age, count]) => ({
                            name: `${age} tuổi`,
                            value: count,
                            color: age === '0-18' ? '#20c997' : age === '19-30' ? '#0dcaf0' : age === '31-50' ? '#0d6efd' : age === '51-70' ? '#6610f2' : '#e83e8c'
                          }))
                          .filter(item => item.value > 0);
                        
                        if (ageData.length === 0) {
                          return <p className="text-muted text-center">Không có dữ liệu</p>;
                        }
                        
                        const CustomTooltip = ({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const total = ageData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Số lượng: <strong>{payload[0].value}</strong>
                                </p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Tỷ lệ: <strong>{percentage}%</strong>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        };
                        
                        return (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={ageData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => {
                                  const total = ageData.reduce((sum, item) => sum + item.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return `${name}: ${percentage}%`;
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {ageData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </Col>
                </Row>

                <div className="mb-4">
                  <h5 className="mb-3">Chi tiết phân bổ theo độ tuổi</h5>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Độ tuổi</th>
                        <th className="text-center">Số lượng</th>
                        <th>Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(patientData.byAgeGroup).map(([age, count]) => {
                        const percentage = patientData.total > 0 ? ((count / patientData.total) * 100).toFixed(1) : 0;
                        return (
                          <tr key={age}>
                            <td>{age} tuổi</td>
                            <td className="text-center">{count}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div style={{ width: '100px', height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', marginRight: '10px' }}>
                                  <div 
                                    style={{ 
                                      width: `${percentage}%`, 
                                      height: '100%', 
                                      backgroundColor: '#0d6efd',
                                      borderRadius: '10px'
                                    }}
                                  />
                                </div>
                                <span>{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>

                <div>
                  <h5 className="mb-3">Danh sách bệnh nhân (50 đầu tiên)</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Họ và tên</th>
                        <th>Giới tính</th>
                        <th>Ngày sinh</th>
                        <th>Số điện thoại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientData.patients.map((patient, idx) => (
                        <tr key={patient.id || idx}>
                          <td>{idx + 1}</td>
                          <td>{patient.fullName || 'N/A'}</td>
                          <td>{patient.gender === 'male' || patient.gender === 'Nam' ? 'Nam' : patient.gender === 'female' || patient.gender === 'Nữ' ? 'Nữ' : 'Khác'}</td>
                          <td>{formatDate(patient.dateOfBirth)}</td>
                          <td>{patient.phone || 'N/A'}</td>
                        </tr>
                      ))}
                      {patientData.patients.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted">Không có dữ liệu</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPatientReportModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Lab Test Report Modal */}
      <Modal show={showLabTestReportModal} onHide={() => setShowLabTestReportModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <FaFlask className="me-2" />
            Báo cáo xét nghiệm
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const labTestData = getLabTestReportData();
            return (
              <>
                <Row className="mb-4">
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Tổng số xét nghiệm</h6>
                        <h3 className="text-primary">{labTestData.total}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Chờ xử lý</h6>
                        <h3 className="text-warning">{labTestData.byStatus.pending}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Đã hoàn thành</h6>
                        <h3 className="text-info">{labTestData.byStatus.completed}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Đã duyệt</h6>
                        <h3 className="text-success">{labTestData.byStatus.approved}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <div className="mb-4">
                      <h5 className="mb-3">Phân bổ theo trạng thái</h5>
                      {(() => {
                        const statusData = Object.entries(labTestData.byStatus)
                          .map(([status, count]) => {
                            const colorMap = {
                              warning: '#ffc107',
                              info: '#0dcaf0',
                              secondary: '#6c757d',
                              success: '#198754',
                              danger: '#dc3545'
                            };
                            const badgeColor = getStatusBadgeColor(status);
                            return {
                              name: getStatusLabel(status),
                              value: count,
                              color: colorMap[badgeColor] || '#6c757d',
                              status: status
                            };
                          })
                          .filter(item => item.value > 0);
                        
                        if (statusData.length === 0) {
                          return <p className="text-muted text-center">Không có dữ liệu</p>;
                        }
                        
                        const CustomTooltip = ({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const total = statusData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                            return (
                              <div style={{
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Số lượng: <strong>{payload[0].value}</strong>
                                </p>
                                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                                  Tỷ lệ: <strong>{percentage}%</strong>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        };
                        
                        return (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => {
                                  const total = statusData.reduce((sum, item) => sum + item.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return `${name}: ${percentage}%`;
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {statusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-4">
                      <h5 className="mb-3">Chi tiết phân bổ</h5>
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Trạng thái</th>
                            <th className="text-center">Số lượng</th>
                            <th>Tỷ lệ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(labTestData.byStatus).map(([status, count]) => {
                            const statusLabel = getStatusLabel(status);
                            const percentage = labTestData.total > 0 ? ((count / labTestData.total) * 100).toFixed(1) : 0;
                            const colorMap = {
                              warning: '#ffc107',
                              info: '#0dcaf0',
                              secondary: '#6c757d',
                              success: '#198754',
                              danger: '#dc3545'
                            };
                            const badgeColor = getStatusBadgeColor(status);
                            const color = colorMap[badgeColor] || '#6c757d';
                            return (
                              <tr key={status}>
                                <td>{statusLabel}</td>
                                <td className="text-center">{count}</td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div style={{ width: '100px', height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', marginRight: '10px' }}>
                                      <div 
                                        style={{ 
                                          width: `${percentage}%`, 
                                          height: '100%', 
                                          backgroundColor: color,
                                          borderRadius: '10px'
                                        }}
                                      />
                                    </div>
                                    <span>{percentage}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>

                <div>
                  <h5 className="mb-3">Danh sách xét nghiệm (50 đầu tiên)</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã xét nghiệm</th>
                        <th>Loại xét nghiệm</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labTestData.labTests.map((test, idx) => {
                        const testStatus = test.normalizedStatus || test.status || test.Status || 'unknown';
                        return (
                          <tr key={test.id || idx}>
                            <td>{idx + 1}</td>
                            <td>XN{String(test.id || test.testId || '').slice(-6)}</td>
                            <td>{test.testPackageName || test.testPackage || test.testType || test.TestType || test.packageName || 'N/A'}</td>
                            <td>
                              <StatusBadge entity="labTest" status={testStatus} />
                            </td>
                            <td>{formatDate(test.createdAt || test.CreatedAt || test.created_at)}</td>
                          </tr>
                        );
                      })}
                      {labTestData.labTests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted">Không có dữ liệu</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLabTestReportModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Financial Report Modal */}
      <Modal show={showFinancialReportModal} onHide={() => setShowFinancialReportModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <FaDollarSign className="me-2" />
            Báo cáo tài chính
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(() => {
            const financialData = getFinancialReportData();
            return (
              <>
                <Row className="mb-4">
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Tổng doanh thu</h6>
                        <h3 className="text-primary">{formatCurrency(financialData.totalRevenue)}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Đã thanh toán</h6>
                        <h3 className="text-success">{formatCurrency(financialData.paidRevenue)}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Chờ thanh toán</h6>
                        <h3 className="text-warning">{formatCurrency(financialData.pendingRevenue)}</h3>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Tổng số hóa đơn</h6>
                        <h4 className="text-primary">{financialData.totalInvoices}</h4>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="text-center">
                      <Card.Body>
                        <h6 className="text-muted">Tỷ lệ thanh toán</h6>
                        <h4 className="text-success">
                          {financialData.totalInvoices > 0 
                            ? ((financialData.paidInvoices / financialData.totalInvoices) * 100).toFixed(1) 
                            : 0}%
                        </h4>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="mb-4">
                  <h5 className="mb-3">Phân bổ thanh toán</h5>
                  {(() => {
                    const paymentData = [
                      { name: 'Đã thanh toán', value: financialData.paidInvoices, color: '#198754' },
                      { name: 'Chờ thanh toán', value: financialData.pendingInvoices, color: '#ffc107' }
                    ].filter(item => item.value > 0);
                    
                    if (paymentData.length === 0) {
                      return <p className="text-muted text-center">Không có dữ liệu</p>;
                    }
                    
                    const CustomTooltip = ({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const total = paymentData.reduce((sum, item) => sum + item.value, 0);
                        const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                        return (
                          <div style={{
                            backgroundColor: '#fff',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                              Số lượng: <strong>{payload[0].value}</strong>
                            </p>
                            <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                              Tỷ lệ: <strong>{percentage}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    };
                    
                    return (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={paymentData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => {
                              const total = paymentData.reduce((sum, item) => sum + item.value, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                              return `${name}: ${percentage}%`;
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {paymentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>

                <div>
                  <h5 className="mb-3">Danh sách hóa đơn (50 đầu tiên)</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã hóa đơn</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.invoices.map((invoice, idx) => (
                        <tr key={invoice.id || idx}>
                          <td>{idx + 1}</td>
                          <td>HD{String(invoice.id || '').slice(-6)}</td>
                          <td className="text-end">{formatCurrency(invoice.totalAmount || invoice.amount || 0)}</td>
                          <td>
                            <StatusBadge entity="invoice" status={invoice.status} />
                          </td>
                          <td>{formatDate(invoice.invoiceDate || invoice.createdAt)}</td>
                        </tr>
                      ))}
                      {financialData.invoices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted">Không có dữ liệu</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFinancialReportModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Summary Report Modal */}
      <Modal show={showSummaryReportModal} onHide={() => setShowSummaryReportModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title>
            <FaChartBar className="me-2" />
            Báo cáo tổng hợp
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-4">
            <Col md={6}>
              <Card className="text-center mb-3">
                <Card.Body>
                  <h6 className="text-muted">Tổng doanh thu</h6>
                  <h3 className="text-primary">{formatCurrency(stats.totalRevenue)}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="text-center mb-3">
                <Card.Body>
                  <h6 className="text-muted">Tổng bệnh nhân</h6>
                  <h3 className="text-info">{stats.totalPatients}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="text-center mb-3">
                <Card.Body>
                  <h6 className="text-muted">Tổng lịch hẹn</h6>
                  <h3 className="text-success">{stats.totalAppointments}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="text-center mb-3">
                <Card.Body>
                  <h6 className="text-muted">Tổng xét nghiệm</h6>
                  <h3 className="text-warning">{stats.totalLabTests}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={6}>
              <div className="mb-4">
                <h5 className="mb-3">Tỷ lệ hoàn thành xét nghiệm</h5>
                {(() => {
                  const completionData = [
                    { name: 'Hoàn thành', value: stats.completedTests, color: '#198754' },
                    { name: 'Chờ xử lý', value: stats.pendingTests, color: '#ffc107' },
                    { name: 'Khác', value: stats.totalLabTests - stats.completedTests - stats.pendingTests, color: '#6c757d' }
                  ].filter(item => item.value > 0);
                  
                  if (completionData.length === 0) {
                    return <p className="text-muted text-center">Không có dữ liệu</p>;
                  }
                  
                  const CustomTooltip = ({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const total = completionData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                      return (
                        <div style={{
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                          <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                            Số lượng: <strong>{payload[0].value}</strong>
                          </p>
                          <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                            Tỷ lệ: <strong>{percentage}%</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  };
                  
                  return (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={completionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => {
                            const total = completionData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${name}: ${percentage}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {completionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </Col>
            <Col md={6}>
              <div className="mb-4">
                <h5 className="mb-3">Tỷ lệ thanh toán</h5>
                {(() => {
                  const paymentData = [
                    { name: 'Đã thanh toán', value: stats.paidInvoices, color: '#198754' },
                    { name: 'Chờ thanh toán', value: stats.pendingInvoices, color: '#ffc107' }
                  ].filter(item => item.value > 0);
                  
                  if (paymentData.length === 0) {
                    return <p className="text-muted text-center">Không có dữ liệu</p>;
                  }
                  
                  const CustomTooltip = ({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const total = paymentData.reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
                      return (
                        <div style={{
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                          <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                            Số lượng: <strong>{payload[0].value}</strong>
                          </p>
                          <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
                            Tỷ lệ: <strong>{percentage}%</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  };
                  
                  return (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => {
                            const total = paymentData.reduce((sum, item) => sum + item.value, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${name}: ${percentage}%`;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </Col>
          </Row>

          <div className="mb-4">
            <h5 className="mb-3">Chi tiết tỷ lệ hoàn thành</h5>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Chỉ tiêu</th>
                  <th className="text-center">Giá trị</th>
                  <th>Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tỷ lệ hoàn thành xét nghiệm</td>
                  <td className="text-center">{stats.completionRate}%</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '100px', height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', marginRight: '10px' }}>
                        <div 
                          style={{ 
                            width: `${stats.completionRate}%`, 
                            height: '100%', 
                            backgroundColor: '#198754',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                      <span>{stats.completedTests}/{stats.totalLabTests}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>Tỷ lệ thanh toán</td>
                  <td className="text-center">{stats.paymentRate}%</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div style={{ width: '100px', height: '20px', backgroundColor: '#e9ecef', borderRadius: '10px', marginRight: '10px' }}>
                        <div 
                          style={{ 
                            width: `${stats.paymentRate}%`, 
                            height: '100%', 
                            backgroundColor: '#0dcaf0',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                      <span>{stats.paidInvoices}/{stats.revenue?.length || 0}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div>
            <h5 className="mb-3">Thống kê nhanh</h5>
            <Row>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FaCheckCircle className="text-success mb-2" style={{fontSize: '2rem'}} />
                    <h6>Xét nghiệm hoàn thành</h6>
                    <h4>{stats.completedTests}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FaClock className="text-warning mb-2" style={{fontSize: '2rem'}} />
                    <h6>Xét nghiệm chờ xử lý</h6>
                    <h4>{stats.pendingTests}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <FaDollarSign className="text-success mb-2" style={{fontSize: '2rem'}} />
                    <h6>Hóa đơn đã thanh toán</h6>
                    <h4>{stats.paidInvoices}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSummaryReportModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminReports;
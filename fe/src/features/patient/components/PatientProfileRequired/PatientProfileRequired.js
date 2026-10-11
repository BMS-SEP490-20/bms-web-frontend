/**
 * Patient Profile Required Component
 * 
 * Component that forces patients to complete their profile information
 * before accessing other features. Shows a form to fill in required fields:
 * - Full Name
 * - Phone Number
 * - Date of Birth
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../../../services/patientService';
import { isPatientInfoComplete, validateDateOfBirthAge, getMinDateOfBirth, getMaxDateOfBirth } from '../../../../shared/utils/patientInfoValidator';
import PatientHeader from '../../../../components/Layout/PatientHeader';
import GuestFooter from '../../../../components/Layout/GuestFooter';

/**
 * Patient Profile Required Component
 * 
 * @returns {React.ReactNode} Patient profile required component
 */
const PatientProfileRequired = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: ''
  });
  const [errors, setErrors] = useState({});
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Load patient data
  useEffect(() => {
    const loadPatientData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const result = await patientService.getPatientByEmail(user.email);
        if (result.success && result.data) {
          const patientData = result.data;
          setPatient(patientData);
          
          // Pre-fill form with existing data
          // Handle date format conversion
          let dobValue = '';
          if (patientData.dob || patientData.Dob) {
            const dob = patientData.dob || patientData.Dob;
            if (typeof dob === 'string') {
              dobValue = dob.split('T')[0]; // Extract YYYY-MM-DD from ISO string
            } else {
              dobValue = new Date(dob).toISOString().split('T')[0];
            }
          } else if (patientData.dateOfBirth || patientData.DateOfBirth || patientData.date_of_birth) {
            const dob = patientData.dateOfBirth || patientData.DateOfBirth || patientData.date_of_birth;
            if (typeof dob === 'string') {
              dobValue = dob.split('T')[0];
            } else {
              dobValue = new Date(dob).toISOString().split('T')[0];
            }
          }

          setFormData({
            fullName: patientData.fullname || patientData.Fullname || patientData.fullName || patientData.FullName || patientData.full_name || '',
            phone: patientData.phone || patientData.Phone || patientData.phone_number || '',
            dateOfBirth: dobValue
          });
        } else {
          // Patient record doesn't exist yet, form will be empty
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [user]);

  // Handle redirect when shouldRedirect is true
  useEffect(() => {
    if (shouldRedirect) {
      
      // Set flag to skip PatientRouteWrapper check
      sessionStorage.setItem('patientProfileJustUpdated', 'true');
      sessionStorage.setItem('patientProfileUpdateTime', Date.now().toString());
      
      // Redirect immediately without delay
      
      // Force redirect using window.location (most reliable)
      try {
        window.location.href = '/patient/dashboard';
      } catch (err) {
        // Fallback to navigate
        try {
          navigate('/patient/dashboard', { replace: true });
        } catch (navErr) {
          // Last resort
          window.location.replace('/patient/dashboard');
        }
      }
    }
  }, [shouldRedirect, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName || formData.fullName.trim() === '') {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }
    
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Số điện thoại phải có 10-11 chữ số';
    }
    
    // Validate date of birth with age restriction (18-60 years old)
    const dateOfBirthValidation = validateDateOfBirthAge(formData.dateOfBirth);
    if (!dateOfBirthValidation.isValid) {
      newErrors.dateOfBirth = dateOfBirthValidation.message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Vui lòng điền đầy đủ và chính xác các thông tin bắt buộc');
      return;
    }

    setSaving(true);
    
    try {
      let result;
      
      if (patient?.id) {
        // Update existing patient - use backend format
        // Load existing patient data first to preserve other fields
        let existingPatientData = null;
        try {
          const patientResult = await patientService.getPatientById(patient.id);
          if (patientResult.success && patientResult.data) {
            existingPatientData = patientResult.data;
          }
        } catch (err) {
        }

        // Build update data according to backend DTO format
        const patientUpdateData = {
          Id: patient.id,
          Fullname: formData.fullName.trim(),
          Phone: formData.phone.trim(),
          Dob: formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : null,
          UpdatedAt: new Date().toISOString()
        };

        // Preserve existing fields
        if (existingPatientData) {
          if (existingPatientData.email || existingPatientData.Email) {
            patientUpdateData.Email = existingPatientData.email || existingPatientData.Email;
          }
          if (existingPatientData.gender || existingPatientData.Gender) {
            patientUpdateData.Gender = existingPatientData.gender || existingPatientData.Gender || 'Unknown';
          }
          if (existingPatientData.address || existingPatientData.Address) {
            patientUpdateData.Address = existingPatientData.address || existingPatientData.Address;
          }
        } else {
          // Fallback values if can't load existing data
          patientUpdateData.Email = user.email || '';
          patientUpdateData.Gender = 'Unknown';
          patientUpdateData.Address = 'N/A';
        }

        result = await patientService.updatePatient(patient.id, patientUpdateData);
      } else {
        // Create new patient record - use backend format
        const createData = {
          Fullname: formData.fullName.trim(),
          Email: user.email || '',
          Phone: formData.phone.trim(),
          Dob: formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : null,
          Gender: 'Unknown',
          Address: 'N/A',
          BloodType: 'N/A',
          IdentityNumber: '',
          Medical_History: ''
        };
        result = await patientService.createPatient(createData);
      }
      
      
      // Check if save was successful (handle different response formats)
      const isSuccess = result && (
        result.success === true || 
        result.success === 'true' ||
        (result.data && !result.message) ||
        (result.status === 200 || result.status === 201)
      );
      
      
      if (isSuccess) {
        
        // Update user context first
        const updatedUser = {
          ...user,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          dateOfBirth: formData.dateOfBirth
        };
        updateUser(updatedUser);
        
        // Set flag immediately to skip PatientRouteWrapper check
        sessionStorage.setItem('patientProfileJustUpdated', 'true');
        sessionStorage.setItem('patientProfileUpdateTime', Date.now().toString());
        
        
        // Show success message (non-blocking)
        showSuccess('✅ Cập nhật thông tin thành công! Đang chuyển đến trang chủ...');
        
        // Force redirect using window.location - this will cause a full page reload
        // which bypasses React Router and ensures redirect works
        
        // Redirect immediately - use full URL to ensure it works
        const targetUrl = window.location.origin + '/patient/dashboard';
        
        // Direct assignment - this should work immediately
        window.location.href = targetUrl;
      } else {
        const errorMsg = result?.message || 'Có lỗi xảy ra khi cập nhật thông tin';
        showError(errorMsg);
      }
    } catch (error) {
      // Error handling
      
      // Even on error, if we have the data, try to redirect anyway
      // (maybe partial save succeeded)
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại';
      showError(errorMsg);
      
      // Don't redirect on error - let user fix and try again
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PatientHeader />
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-lg border-0" style={{ borderRadius: '20px' }}>
                <Card.Body className="p-5">
                  <div className="text-center mb-4">
                    <motion.div
                      className="d-inline-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                        boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)'
                      }}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <i className="fas fa-exclamation-triangle fa-2x text-white"></i>
                    </motion.div>
                    <h3 className="fw-bold text-dark mb-2">
                      Cần cập nhật thông tin cá nhân
                    </h3>
                    <p className="text-muted mb-0">
                      Để sử dụng dịch vụ, vui lòng điền đầy đủ các thông tin bắt buộc bên dưới
                    </p>
                  </div>

                  <Alert variant="info" className="border-0" style={{ borderRadius: '15px' }}>
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Thông tin bắt buộc:</strong> Họ và tên, Số điện thoại, Ngày tháng năm sinh
                  </Alert>

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-user me-2 text-primary"></i>
                        Họ và tên <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên đầy đủ"
                        isInvalid={!!errors.fullName}
                        className="border-2 rounded-pill px-4 py-3"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.fullName}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-phone me-2 text-primary"></i>
                        Số điện thoại <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        isInvalid={!!errors.phone}
                        className="border-2 rounded-pill px-4 py-3"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">
                        <i className="fas fa-calendar me-2 text-primary"></i>
                        Ngày tháng năm sinh <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        isInvalid={!!errors.dateOfBirth}
                        className="border-2 rounded-pill px-4 py-3"
                        min={getMinDateOfBirth()}
                        max={getMaxDateOfBirth()}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.dateOfBirth}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-100 rounded-pill py-3"
                      disabled={saving}
                      style={{
                        background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
                        border: 'none',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        boxShadow: '0 8px 24px rgba(0, 102, 204, 0.3)'
                      }}
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Lưu thông tin
                        </>
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
      <GuestFooter />
    </motion.div>
  );
};

export default PatientProfileRequired;


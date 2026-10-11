/**
 * Patient Route Wrapper Component
 * 
 * Wraps patient routes to check if patient information is complete.
 * Redirects to profile completion page if information is incomplete.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { patientService } from '../../../services/patientService';
import { isPatientInfoComplete } from '../../utils/patientInfoValidator';

/**
 * Patient Route Wrapper
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if patient info is complete
 * @returns {React.ReactNode} Children or redirect to profile completion
 */
const PatientRouteWrapper = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [infoComplete, setInfoComplete] = useState(true);

  useEffect(() => {
    const checkPatientInfo = async () => {
      if (!isAuthenticated || !user) {
        setChecking(false);
        return;
      }

      // Only check for patient role
      const userRoleId = typeof user.roleId === 'string' ? parseInt(user.roleId, 10) : user.roleId;
      const isPatient = userRoleId === 5 || user.role === 'patient';
      
      if (!isPatient) {
        setChecking(false);
        setInfoComplete(true);
        return;
      }

      // Check if profile was just updated (within last 10 seconds)
      // This prevents redirect loop after saving profile
      const justUpdated = sessionStorage.getItem('patientProfileJustUpdated') === 'true';
      const updateTime = parseInt(sessionStorage.getItem('patientProfileUpdateTime') || '0', 10);
      const timeSinceUpdate = Date.now() - updateTime;
      const isRecentUpdate = justUpdated && timeSinceUpdate < 10000; // 10 seconds

      if (isRecentUpdate) {
        // Clear the flag after using it (but keep it for a bit longer to ensure redirect works)
        // Don't remove immediately - let it expire naturally after 10 seconds
        setInfoComplete(true);
        setChecking(false);
        return; // IMPORTANT: Return early to skip the fetch below
      }

      try {
        // Fetch patient data by email
        const result = await patientService.getPatientByEmail(user.email);
        
        if (result.success && result.data) {
          const validation = isPatientInfoComplete(result.data);
          
          setInfoComplete(validation.isComplete);
          
          // If validation shows incomplete but we just updated, trust the flag
          if (!validation.isComplete && isRecentUpdate) {
            setInfoComplete(true);
          }
        } else {
          // Patient record doesn't exist, info is incomplete
          // But if we just updated, trust the flag
          if (isRecentUpdate) {
            setInfoComplete(true);
          } else {
            setInfoComplete(false);
          }
        }
      } catch (error) {
        // On error, check if we just updated
        if (isRecentUpdate) {
          setInfoComplete(true);
        } else {
          // On error, assume incomplete to be safe
          setInfoComplete(false);
        }
      } finally {
        setChecking(false);
      }
    };

    checkPatientInfo();
  }, [user, isAuthenticated]);

  if (checking) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!infoComplete) {
    return <Navigate to="/patient/profile-required" replace />;
  }

  return children;
};

export default PatientRouteWrapper;


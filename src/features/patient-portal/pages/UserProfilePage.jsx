/**
 * @file UserProfilePage.jsx
 * @description Patient & Clinical User Profile management screen (UC08).
 * Features: 2-column layout, PII masking, active session indicator, and Shimmer skeleton loading.
 * Conforms to: OWASP Top 10 (A01: IDOR Prevention) & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert } from 'react-bootstrap';
import { getUserProfile } from '../../../services/userService';
import { SkeletonProfile } from '../../../components/common/SkeletonProfile';
import './UserProfilePage.css';

export const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await getUserProfile();
      if (result.isSuccess && result.data) {
        setProfile(result.data);
      } else {
        setErrorMessage(result.message || 'Unable to load profile.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to BMS services.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bms-profile-page">
        <SkeletonProfile />
      </div>
    );
  }

  return (
    <div className="bms-profile-page">
      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </Alert>
      )}

      {profile && (
        <Row className="g-4">
          {/* Left Column: Avatar & Overview Card */}
          <Col xs={12} lg={4}>
            <div className="bms-profile-card text-center p-4">
              <div className="bms-avatar-wrapper">
                <img
                  src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
                  alt={profile.fullName}
                  className="bms-avatar-img"
                />
                <span className="bms-active-dot" title="Active Account"></span>
              </div>

              <h4 className="fw-bold mb-1 text-dark">{profile.fullName}</h4>
              <p className="text-muted small mb-1">@{profile.username}</p>

              <div>
                <span className="bms-patient-code-badge">
                  <i className="bi bi-person-vcard me-1"></i>
                  {profile.patientCode}
                </span>
              </div>

              <div>
                <span className="bms-role-badge">
                  <i className="bi bi-shield-check"></i>
                  {profile.role}
                </span>
              </div>

              <hr className="my-4 text-muted" />

              <div className="text-start small">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Status:</span>
                  <span className="text-success fw-semibold">
                    <i className="bi bi-check-circle-fill me-1"></i>Active
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Member Since:</span>
                  <span className="text-dark fw-medium">{profile.createdAt}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">2FA Protection:</span>
                  <span className="text-primary fw-semibold">
                    <i className="bi bi-shield-lock-fill me-1"></i>Enabled (OTP)
                  </span>
                </div>
              </div>

              <div className="d-grid mt-4">
                <Button variant="outline-primary" size="sm" onClick={fetchProfile}>
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh Profile
                </Button>
              </div>
            </div>
          </Col>

          {/* Right Column: Detailed Clinical Profile Form */}
          <Col xs={12} lg={8}>
            <div className="bms-profile-card">
              <div className="bms-profile-card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold m-0 text-white">Clinical Account Information</h5>
                  <small className="text-white-50">Personal identity and medical records profile</small>
                </div>
                <Badge bg="light" text="dark" className="px-3 py-2 fw-semibold">
                  <i className="bi bi-lock-fill me-1"></i>IDOR Protected
                </Badge>
              </div>

              <div className="p-4">
                <Row className="g-3">
                  <Col md={6}>
                    <div className="bms-field-label">Full Name</div>
                    <div className="bms-field-value">{profile.fullName}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Citizen ID (CCCD/CMND)</div>
                    <div className="bms-field-value">{profile.identityCardNumberMasked}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Date of Birth</div>
                    <div className="bms-field-value">
                      <i className="bi bi-calendar-event me-2 text-muted"></i>
                      {profile.dateOfBirth}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Gender</div>
                    <div className="bms-field-value">{profile.gender}</div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Phone Number</div>
                    <div className="bms-field-value">
                      <i className="bi bi-telephone me-2 text-muted"></i>
                      {profile.phoneNumber}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Email Address</div>
                    <div className="bms-field-value">
                      <i className="bi bi-envelope me-2 text-muted"></i>
                      {profile.email}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">Blood Type</div>
                    <div className="bms-field-value">
                      <span className="bms-blood-badge">
                        <i className="bi bi-droplet-fill me-1"></i>
                        {profile.bloodType}
                      </span>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="bms-field-label">System Role</div>
                    <div className="bms-field-value">{profile.role}</div>
                  </Col>

                  <Col xs={12}>
                    <div className="bms-field-label">Registered Residential Address</div>
                    <div className="bms-field-value">
                      <i className="bi bi-geo-alt me-2 text-muted"></i>
                      {profile.address}
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default UserProfilePage;

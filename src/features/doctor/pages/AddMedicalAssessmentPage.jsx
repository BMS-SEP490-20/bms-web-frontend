/**
 * @file AddMedicalAssessmentPage.jsx
 * @description UC50 – Add Medical Assessment Page (Iteration 3).
 * Clinician workspace for entering medical assessments with patient & encounter association,
 * clinical data validation, WHO ICD-10 diagnostic coding, and lab recommendations.
 * Conforms to: Production Standards & AGENTS-DESIGN.md.
 * @module features/doctor/pages/AddMedicalAssessmentPage
 */

import React, { useState, useEffect } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaStethoscope,
  FaClipboardList,
  FaUserMd
} from 'react-icons/fa';
import MedicalAssessmentForm from '../components/MedicalAssessmentForm';
import { medicalAssessmentApi } from '../api/medicalAssessmentApi';

export default function AddMedicalAssessmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();

  const queryPatientId = searchParams.get('patientId');
  const queryEncounterId = searchParams.get('encounterId');

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      medicalAssessmentApi.getAssessmentById(id)
        .then((res) => {
          if (res?.data) {
            setInitialData(res.data);
          }
        })
        .catch((err) => {
          setFetchError(err.message || 'Không thể tải thông tin hồ sơ đánh giá.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (queryPatientId || queryEncounterId) {
      setInitialData({
        patientId: queryPatientId || '',
        encounterId: queryEncounterId || ''
      });
    }
  }, [id, queryPatientId, queryEncounterId]);

  const handleSuccess = (created) => {
    // After successful creation or update, navigate back to list or detail view
    setTimeout(() => {
      navigate('/medical-assessments');
    }, 1200);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Container fluid className="py-2 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Header & Breadcrumb */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">
            {id ? 'Sửa đánh giá y khoa' : 'Thêm đánh giá y khoa'}
          </h1>
        </div>
        <div className="mt-2 mt-sm-0 d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/medical-assessments')}
            className="d-flex align-items-center gap-2 shadow-sm"
            style={{ borderRadius: '9999px' }}
          >
            <FaClipboardList /> Danh Sách Đánh Giá
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => navigate('/doctor/console')}
            className="d-flex align-items-center gap-2 shadow-sm"
            style={{ borderRadius: '9999px' }}
          >
            <FaUserMd /> Bàn Khám Bác Sĩ
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Đang tải thông tin đánh giá y khoa...</p>
        </div>
      ) : fetchError ? (
        <Alert variant="danger">
          <h5>Không tìm thấy dữ liệu</h5>
          <p>{fetchError}</p>
          <Button variant="outline-danger" onClick={() => navigate('/medical-assessments')}>
            <FaArrowLeft className="me-2" /> Quay lại danh sách
          </Button>
        </Alert>
      ) : (
        <MedicalAssessmentForm
          initialData={initialData}
          isEditMode={Boolean(id)}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </Container>
  );
}

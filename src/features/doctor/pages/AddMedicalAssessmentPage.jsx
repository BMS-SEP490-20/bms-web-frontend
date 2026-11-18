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
    <div className="w-100 py-1">
      {/* Top Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">
              {id ? 'Sửa đánh giá y khoa' : 'Thêm đánh giá y khoa'}
            </h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Ghi nhận triệu chứng lâm sàng, dấu hiệu sinh tồn, chẩn đoán ICD-10 và hướng điều trị.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate('/medical-assessments')}
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 text-nowrap"
          >
            <FaClipboardList /> Danh sách đánh giá
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate('/doctor/console')}
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 text-nowrap"
          >
            <FaUserMd /> Bàn khám bác sĩ
          </Button>
        </div>
      </div>

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
    </div>
  );
}

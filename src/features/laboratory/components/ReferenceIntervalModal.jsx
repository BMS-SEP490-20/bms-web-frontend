/**
 * @file ReferenceIntervalModal.jsx
 * @description Medical-grade modal for creating and updating biological reference intervals (UC57).
 * Built with React-Bootstrap Modal.
 * Complies with ISO 15189:2022, Decision 2429/QD-BYT and BR-LAB-02 / BR-LAB-03.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaHeartbeat, FaShieldAlt, FaSave, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import testCriterionService from '../../../services/testCriterionService';

const COMMON_CRITERIA_LIST = [
  { code: 'GLU', name: 'Glucose máu lúc đói', unit: 'mmol/L' },
  { code: 'HGB', name: 'Huyết sắc tố (Hemoglobin)', unit: 'g/L' },
  { code: 'CRE', name: 'Creatinine huyết thanh', unit: 'µmol/L' },
  { code: 'PLT', name: 'Số lượng tiểu cầu', unit: 'G/L' },
  { code: 'ALT', name: 'Alanine Aminotransferase (Men gan GPT)', unit: 'U/L' },
  { code: 'AST', name: 'Aspartate Aminotransferase (Men gan GOT)', unit: 'U/L' },
  { code: 'K', name: 'Kali máu (Potassium K+)', unit: 'mmol/L' },
  { code: 'NA', name: 'Natri máu (Sodium Na+)', unit: 'mmol/L' },
  { code: 'CHOL', name: 'Cholesterol toàn phần', unit: 'mmol/L' },
  { code: 'TRIG', name: 'Triglycerides', unit: 'mmol/L' },
  { code: 'UREA', name: 'Ure máu (BUN)', unit: 'mmol/L' },
  { code: 'HBA1C', name: 'Hemoglobin A1c', unit: '%' },
];

const STANDARD_AUTHORITIES = [
  'Quyết định 2429/QĐ-BYT',
  'WHO Laboratory Manual',
  'ADA Standards of Care 2024',
  'CLSI C28-A3c Guidelines',
  'KDIGO Guidelines',
  'NCEP ATP III',
];

export default function ReferenceIntervalModal({
  isOpen,
  mode = 'create',
  interval = null,
  initialCriterionCode = '',
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    criterionCode: '',
    criterionName: '',
    unit: '',
    gender: 'All',
    ageMin: 18,
    ageMax: 120,
    ageUnit: 'Years',
    demographicLabel: '',
    normalMin: '',
    normalMax: '',
    normalText: '',
    panicLow: '',
    panicHigh: '',
    condition: 'General',
    standardAuthority: 'Quyết định 2429/QĐ-BYT',
    notes: '',
    isActive: true,
  });

  const [criteriaOptions, setCriteriaOptions] = useState(COMMON_CRITERIA_LIST);
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    testCriterionService
      .getCriteria({ page: 1, pageSize: 100, isActive: true })
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          const mapped = items.map((c) => ({
            code: (c.criterionCode || c.code || '').toUpperCase(),
            name: c.criterionName || c.name || '',
            unit: c.unit || ''
          })).filter((c) => c.code);
          if (mapped.length > 0) setCriteriaOptions(mapped);
        }
      })
      .catch(() => {
        // Keep fallback COMMON_CRITERIA_LIST
      });
  }, []);

  useEffect(() => {
    if (interval && mode === 'edit') {
      setFormData({
        criterionCode: interval.criterionCode || '',
        criterionName: interval.criterionName || '',
        unit: interval.unit || '',
        gender: interval.gender || 'All',
        ageMin: interval.ageMin ?? 0,
        ageMax: interval.ageMax ?? 120,
        ageUnit: interval.ageUnit || 'Years',
        demographicLabel: interval.demographicLabel || '',
        normalMin: interval.normalMin !== null && interval.normalMin !== undefined ? interval.normalMin : '',
        normalMax: interval.normalMax !== null && interval.normalMax !== undefined ? interval.normalMax : '',
        normalText: interval.normalText || '',
        panicLow: interval.panicLow !== null && interval.panicLow !== undefined ? interval.panicLow : '',
        panicHigh: interval.panicHigh !== null && interval.panicHigh !== undefined ? interval.panicHigh : '',
        condition: interval.condition || 'General',
        standardAuthority: interval.standardAuthority || 'Quyết định 2429/QĐ-BYT',
        notes: interval.notes || '',
        isActive: interval.isActive !== undefined ? interval.isActive : true,
      });
    } else {
      const code = initialCriterionCode || 'HGB';
      const preset = criteriaOptions.find((c) => c.code === code) || criteriaOptions[0] || COMMON_CRITERIA_LIST[0];
      setFormData({
        criterionCode: preset.code,
        criterionName: preset.name,
        unit: preset.unit,
        gender: 'All',
        ageMin: 18,
        ageMax: 120,
        ageUnit: 'Years',
        demographicLabel: 'Người lớn trưởng thành (≥ 18 tuổi)',
        normalMin: '',
        normalMax: '',
        normalText: '',
        panicLow: '',
        panicHigh: '',
        condition: 'General',
        standardAuthority: 'Quyết định 2429/QĐ-BYT',
        notes: '',
        isActive: true,
      });
    }
    setValidationError('');
  }, [interval, mode, isOpen, initialCriterionCode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: val };

      // Auto update criterion name and unit when criterionCode changes
      if (name === 'criterionCode') {
        const found = criteriaOptions.find((c) => c.code === value);
        if (found) {
          updated.criterionName = found.name;
          updated.unit = found.unit;
        }
      }

      // Auto-update demographicLabel if user hasn't explicitly customized it
      if (name === 'gender' || name === 'ageMin' || name === 'ageMax' || name === 'condition') {
        const genderText =
          updated.gender === 'Male' ? 'Nam' : updated.gender === 'Female' ? 'Nữ' : 'Tất cả';
        const condText =
          updated.condition && updated.condition !== 'General' ? ` (${updated.condition})` : '';
        updated.demographicLabel = `${genderText} [${updated.ageMin} - ${updated.ageMax} tuổi]${condText}`;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const ageMin = parseFloat(formData.ageMin);
    const ageMax = parseFloat(formData.ageMax);

    if (isNaN(ageMin) || isNaN(ageMax)) {
      setValidationError('Độ tuổi tối thiểu và tối đa bắt buộc phải là số.');
      return;
    }
    if (ageMin > ageMax) {
      setValidationError(`Tuổi tối thiểu (${ageMin}) không được lớn hơn tuổi tối đa (${ageMax}).`);
      return;
    }

    const normMin = formData.normalMin !== '' ? parseFloat(formData.normalMin) : null;
    const normMax = formData.normalMax !== '' ? parseFloat(formData.normalMax) : null;
    const pLow = formData.panicLow !== '' ? parseFloat(formData.panicLow) : null;
    const pHigh = formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null;

    if (normMin !== null && normMax !== null && normMin > normMax) {
      setValidationError(`Giới hạn dưới bình thường (${normMin}) không được lớn hơn giới hạn trên (${normMax}).`);
      return;
    }

    if (pLow !== null && normMin !== null && pLow > normMin) {
      setValidationError(`Ngưỡng Panic thấp (${pLow}) phải nhỏ hơn hoặc bằng giới hạn dưới bình thường (${normMin}).`);
      return;
    }

    if (pHigh !== null && normMax !== null && pHigh < normMax) {
      setValidationError(`Ngưỡng Panic cao (${pHigh}) phải lớn hơn hoặc bằng giới hạn trên bình thường (${normMax}).`);
      return;
    }

    const payload = {
      criterionCode: formData.criterionCode.trim().toUpperCase(),
      criterionName: formData.criterionName.trim(),
      unit: formData.unit.trim(),
      gender: formData.gender,
      ageMin,
      ageMax,
      ageUnit: formData.ageUnit,
      demographicLabel: formData.demographicLabel.trim(),
      normalMin: normMin,
      normalMax: normMax,
      normalText: formData.normalText ? formData.normalText.trim() : null,
      panicLow: pLow,
      panicHigh: pHigh,
      condition: formData.condition,
      standardAuthority: formData.standardAuthority,
      notes: formData.notes.trim(),
      isActive: formData.isActive,
    };

    try {
      setSubmitting(true);
      await onSave(payload, interval?.id);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Có lỗi xảy ra khi lưu khoảng tham chiếu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-light py-3">
        <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2 text-primary">
          <FaHeartbeat />
          {mode === 'create' ? 'Cấu Hình Khoảng Tham Chiếu Mới (UC57)' : 'Cập Nhật Khoảng Tham Chiếu Sinh Học'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {validationError && (
            <Alert variant="danger" className="py-2 mb-3">
              <FaExclamationTriangle className="me-2" />
              {validationError}
            </Alert>
          )}

          <div className="mb-3 p-3 bg-light rounded border">
            <h6 className="fw-bold text-dark mb-3">1. Thông Tin Chỉ Số Xét Nghiệm</h6>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mã chỉ số (Code) *</Form.Label>
                  {mode === 'create' ? (
                    <Form.Select
                      name="criterionCode"
                      value={formData.criterionCode}
                      onChange={handleChange}
                      required
                    >
                      {criteriaOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.unit})
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      type="text"
                      name="criterionCode"
                      value={formData.criterionCode}
                      disabled
                      className="bg-secondary bg-opacity-10 fw-bold"
                    />
                  )}
                </Form.Group>
              </Col>

              <Col md={5}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tên chỉ số xét nghiệm</Form.Label>
                  <Form.Control
                    type="text"
                    name="criterionName"
                    value={formData.criterionName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Đơn vị đo (Unit)</Form.Label>
                  <Form.Control
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="vd: mmol/L, g/L"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="mb-3 p-3 bg-light rounded border">
            <h6 className="fw-bold text-dark mb-3">2. Phân Đoạn Nhân Khẩu Học (Demographics)</h6>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giới tính áp dụng *</Form.Label>
                  <Form.Select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="All">Tất cả giới tính (All)</option>
                    <option value="Male">Nam (Male)</option>
                    <option value="Female">Nữ (Female)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tuổi từ (Min) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    name="ageMin"
                    value={formData.ageMin}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tuổi đến (Max) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    name="ageMax"
                    value={formData.ageMax}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Đơn vị tuổi</Form.Label>
                  <Form.Select name="ageUnit" value={formData.ageUnit} onChange={handleChange}>
                    <option value="Years">Năm</option>
                    <option value="Months">Tháng</option>
                    <option value="Days">Ngày</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Bối cảnh lâm sàng</Form.Label>
                  <Form.Select name="condition" value={formData.condition} onChange={handleChange}>
                    <option value="General">Thông thường (General)</option>
                    <option value="Fasting ≥ 8h">Nhịn ăn (Fasting ≥ 8h)</option>
                    <option value="Pregnancy">Thai kỳ (Pregnancy)</option>
                    <option value="Pediatric">Nhi khoa (Pediatric)</option>
                    <option value="Elderly">Người cao tuổi (Elderly)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nhãn nhóm nhân khẩu học</Form.Label>
                  <Form.Control
                    type="text"
                    name="demographicLabel"
                    value={formData.demographicLabel}
                    onChange={handleChange}
                    placeholder="vd: Nam trưởng thành 18-65 tuổi"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="mb-3 p-3 bg-light rounded border">
            <h6 className="fw-bold text-dark mb-3">3. Khoảng Giá Trị Sinh Học & Ngưỡng Nguy Kịch</h6>
            <Row className="g-3">
              <Col md={6}>
                <div className="p-3 bg-white rounded border">
                  <span className="fw-semibold text-success d-block mb-2">
                    Khoảng Tham Chiếu Bình Thường ({formData.unit || 'Unit'})
                  </span>
                  <Row className="g-2">
                    <Col sm={6}>
                      <Form.Label className="small text-muted">Giới hạn dưới (Min)</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        name="normalMin"
                        value={formData.normalMin}
                        onChange={handleChange}
                        placeholder="vd: 130"
                      />
                    </Col>
                    <Col sm={6}>
                      <Form.Label className="small text-muted">Giới hạn trên (Max)</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        name="normalMax"
                        value={formData.normalMax}
                        onChange={handleChange}
                        placeholder="vd: 175"
                      />
                    </Col>
                  </Row>
                </div>
              </Col>

              <Col md={6}>
                <div className="p-3 bg-white rounded border border-danger border-opacity-50">
                  <span className="fw-semibold text-danger d-block mb-2">
                    Ngưỡng Báo Động Nguy Kịch PANIC (BR-LAB-03)
                  </span>
                  <Row className="g-2">
                    <Col sm={6}>
                      <Form.Label className="small text-muted">Panic Thấp (&lt;)</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        name="panicLow"
                        value={formData.panicLow}
                        onChange={handleChange}
                        placeholder="vd: 70"
                        className="border-danger"
                      />
                    </Col>
                    <Col sm={6}>
                      <Form.Label className="small text-muted">Panic Cao (&gt;)</Form.Label>
                      <Form.Control
                        type="number"
                        step="any"
                        name="panicHigh"
                        value={formData.panicHigh}
                        onChange={handleChange}
                        placeholder="vd: 200"
                        className="border-danger"
                      />
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </div>

          <div className="p-3 bg-light rounded border">
            <h6 className="fw-bold text-dark mb-3">4. Tiêu Chuẩn Thẩm Định & Ghi Chú</h6>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Quy chuẩn / Căn cứ pháp lý</Form.Label>
                  <Form.Select
                    name="standardAuthority"
                    value={formData.standardAuthority}
                    onChange={handleChange}
                  >
                    {STANDARD_AUTHORITIES.map((auth) => (
                      <option key={auth} value={auth}>
                        {auth}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Trạng thái áp dụng</Form.Label>
                  <Form.Check
                    type="switch"
                    id="interval-isactive"
                    label={formData.isActive ? 'Đang áp dụng (Active)' : 'Tạm khóa (Inactive)'}
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="mt-2"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ghi chú diễn giải lâm sàng</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Ghi chú hướng dẫn cho kỹ thuật viên và bác sĩ thẩm định..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-light py-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            <FaTimes className="me-1" /> Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" /> Đang lưu...
              </>
            ) : (
              <>
                <FaSave className="me-1" /> Lưu Cấu Hình
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

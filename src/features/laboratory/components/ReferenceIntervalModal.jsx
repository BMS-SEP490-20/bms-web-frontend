/**
 * @file ReferenceIntervalModal.jsx
 * @description Medical-grade modal for creating and updating biological reference intervals (UC57).
 * Built with React-Bootstrap Modal.
 * Complies with ISO 15189:2022, Decision 2429/QD-BYT and BR-LAB-02 / BR-LAB-03.
 * Enforces rule: Each test criterion has exactly ONE biological reference interval (no duplicates allowed).
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaHeartbeat, FaShieldAlt, FaSave, FaTimes, FaExclamationTriangle, FaCheckCircle, FaBan } from 'react-icons/fa';
import testCriterionService from '../../../services/testCriterionService';
import referenceIntervalService from '../../../services/referenceIntervalService';

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
  const [criterionGenderMap, setCriterionGenderMap] = useState({});
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Tải danh mục chỉ số xét nghiệm từ hệ thống
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
        // Giữ danh sách mặc định COMMON_CRITERIA_LIST
      });

    // 2. Tải danh sách tất cả các chỉ số đã có khoảng tham chiếu để phân loại Nam/Nữ và chặn trùng lặp
    referenceIntervalService
      .getIntervals({ page: 1, pageSize: 500, isActive: true })
      .then((res) => {
        const safeItems = Array.isArray(res) ? res : (res?.items || res?.Items || res?.data || []);
        const map = {};
        safeItems
          .filter((item) => !item.isDeleted && item.isActive !== false)
          .forEach((item) => {
            const code = (item.criterionCode || item.testId || '').toUpperCase();
            if (!code) return;
            if (!map[code]) {
              map[code] = { hasMale: false, hasFemale: false, maleId: null, femaleId: null, count: 0 };
            }
            const g = (item.gender || '').toUpperCase();
            if (g === 'MALE' || g === 'NAM') {
              map[code].hasMale = true;
              map[code].maleId = item.id;
              map[code].count++;
            } else if (g === 'FEMALE' || g === 'NU' || g === 'NỮ') {
              map[code].hasFemale = true;
              map[code].femaleId = item.id;
              map[code].count++;
            } else if (g === 'ALL') {
              map[code].hasMale = true;
              map[code].hasFemale = true;
              map[code].count += 2;
            }
          });
        setCriterionGenderMap(map);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (interval && mode === 'edit') {
      const g = interval.gender || 'Male';
      const normalizedG = (g.toUpperCase() === 'FEMALE' || g.toUpperCase() === 'NU' || g.toUpperCase() === 'NỮ') ? 'Female' : 'Male';
      setFormData({
        criterionCode: interval.criterionCode || '',
        criterionName: interval.criterionName || '',
        unit: interval.unit || '',
        gender: normalizedG,
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
      // Ưu tiên chọn chỉ số chưa đủ 2 khoảng (1 Nam, 1 Nữ)
      const availablePreset = criteriaOptions.find((c) => {
        const info = criterionGenderMap[c.code];
        return !(info?.hasMale && info?.hasFemale);
      })
        || (initialCriterionCode && criteriaOptions.find((c) => c.code === initialCriterionCode))
        || criteriaOptions[0]
        || COMMON_CRITERIA_LIST[0];

      const chosenCode = availablePreset.code;
      const info = criterionGenderMap[chosenCode];
      const defaultGender = (info?.hasMale && !info?.hasFemale) ? 'Female' : 'Male';
      const genderVi = defaultGender === 'Male' ? 'Nam' : 'Nữ';

      setFormData({
        criterionCode: chosenCode,
        criterionName: availablePreset.name,
        unit: availablePreset.unit,
        gender: defaultGender,
        ageMin: 18,
        ageMax: 120,
        ageUnit: 'Years',
        demographicLabel: `${genderVi} người lớn trưởng thành (≥ 18 tuổi)`,
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
  }, [interval, mode, isOpen, initialCriterionCode, Object.keys(criterionGenderMap).length]);

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
        // Tự động gán giới tính còn thiếu cho chỉ số được chọn
        const info = criterionGenderMap[value];
        if (info?.hasMale && !info?.hasFemale) {
          updated.gender = 'Female';
        } else if (info?.hasFemale && !info?.hasMale) {
          updated.gender = 'Male';
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

  const currentCode = (formData.criterionCode || '').toUpperCase();
  const currentGenderInfo = criterionGenderMap[currentCode] || { hasMale: false, hasFemale: false, count: 0 };
  const hasMale = currentGenderInfo.hasMale;
  const hasFemale = currentGenderInfo.hasFemale;
  const isFullyConfigured = hasMale && hasFemale;

  // Lỗi tạo trùng giới tính khi tạo mới
  const isDuplicateGenderOnCreate = mode === 'create' && (
    (formData.gender === 'Male' && hasMale) ||
    (formData.gender === 'Female' && hasFemale)
  );

  // Lỗi đổi sang giới tính đã có khi sửa
  const isDuplicateGenderOnEdit = mode === 'edit' && (
    (formData.gender === 'Male' && interval?.gender !== 'Male' && hasMale) ||
    (formData.gender === 'Female' && interval?.gender !== 'Female' && hasFemale)
  );

  const isDuplicate = isFullyConfigured || isDuplicateGenderOnCreate || isDuplicateGenderOnEdit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (isFullyConfigured && mode === 'create') {
      setValidationError(
        `Chỉ số xét nghiệm '${formData.criterionCode}' (${formData.criterionName}) đã có đủ 2 khoảng tham chiếu (1 Nam, 1 Nữ). Vui lòng chỉnh sửa khoảng tham chiếu đã có thay vì tạo mới.`
      );
      return;
    }

    if (isDuplicateGenderOnCreate) {
      setValidationError(
        `Chỉ số xét nghiệm '${formData.criterionCode}' đã có khoảng tham chiếu cho giới tính ${formData.gender === 'Male' ? 'Nam' : 'Nữ'}. Mỗi chỉ số chỉ được cấu hình tối đa 1 khoảng cho Nam và 1 khoảng cho Nữ.`
      );
      return;
    }

    if (isDuplicateGenderOnEdit) {
      setValidationError(
        `Không thể chuyển sang giới tính ${formData.gender === 'Male' ? 'Nam' : 'Nữ'} vì chỉ số này đã tồn tại khoảng tham chiếu cho giới tính đó.`
      );
      return;
    }

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

    if (normMin !== null && normMax !== null && normMin > normMax) {
      setValidationError(
        `Giới hạn bình thường dưới (NormalMin: ${normMin}) không được lớn hơn giới hạn trên (NormalMax: ${normMax}).`
      );
      return;
    }

    const pLow = formData.panicLow !== '' ? parseFloat(formData.panicLow) : null;
    const pHigh = formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null;

    if (pLow !== null && normMin !== null && pLow > normMin) {
      setValidationError(`Ngưỡng Panic Low (${pLow}) phải nhỏ hơn hoặc bằng giới hạn dưới (${normMin}).`);
      return;
    }
    if (pHigh !== null && normMax !== null && pHigh < normMax) {
      setValidationError(`Ngưỡng Panic High (${pHigh}) phải lớn hơn hoặc bằng giới hạn trên (${normMax}).`);
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
          {mode === 'create' ? 'Cấu Hình Khoảng Tham Chiếu Mới' : 'Cập Nhật Khoảng Tham Chiếu Sinh Học'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-3">
          {isFullyConfigured && mode === 'create' && (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
              <FaExclamationTriangle className="text-warning flex-shrink-0 fs-5" />
              <div>
                <strong>Chỉ số đã đủ 2 khoảng tham chiếu:</strong> Chỉ số{' '}
                <Badge bg="warning" text="dark" className="fs-6 me-1">
                  {formData.criterionCode}
                </Badge>
                ({formData.criterionName}) đã có đủ <strong>1 khoảng Nam</strong> và <strong>1 khoảng Nữ</strong>. Theo quy chuẩn y tế, mỗi loại chỉ số chỉ cấu hình tối đa 2 khoảng tham chiếu. Vui lòng chọn chỉ số khác hoặc bấm <em>Hủy bỏ</em> để chỉnh sửa khoảng tham chiếu đã có.
              </div>
            </Alert>
          )}

          {isDuplicateGenderOnCreate && !isFullyConfigured && (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
              <FaExclamationTriangle className="text-warning flex-shrink-0 fs-5" />
              <div>
                <strong>Giới tính đã được cấu hình:</strong> Chỉ số{' '}
                <Badge bg="info" className="fs-6 me-1">
                  {formData.criterionCode}
                </Badge>
                đã có khoảng tham chiếu cho giới tính <strong>{formData.gender === 'Male' ? 'Nam' : 'Nữ'}</strong>. Vui lòng chuyển sang giới tính <strong>{formData.gender === 'Male' ? 'Nữ' : 'Nam'}</strong> để cấu hình khoảng tham chiếu còn lại.
              </div>
            </Alert>
          )}

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
                      {criteriaOptions.map((c) => {
                        const statusInfo = criterionGenderMap[c.code];
                        const isFullyDone = statusInfo?.hasMale && statusInfo?.hasFemale;
                        let statusTag = '— [Chưa có khoảng nào (0/2)]';
                        if (isFullyDone) statusTag = '— [Đã đủ 1 Nam, 1 Nữ (2/2)]';
                        else if (statusInfo?.hasMale) statusTag = '— [Đã có Nam - Thiếu Nữ (1/2)]';
                        else if (statusInfo?.hasFemale) statusTag = '— [Đã có Nữ - Thiếu Nam (1/2)]';

                        return (
                          <option key={c.code} value={c.code} disabled={isFullyDone}>
                            {c.code} - {c.name} {statusTag}
                          </option>
                        );
                      })}
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
                  {mode === 'create' && (
                    <Form.Text className="text-muted small">
                      Mỗi loại chỉ số xét nghiệm chỉ có tối đa 2 khoảng: 1 cho Nam và 1 cho Nữ.
                    </Form.Text>
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
                  <Form.Label className="small fw-semibold">Giới tính áp dụng (1 Nam, 1 Nữ) *</Form.Label>
                  <Form.Select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option
                      value="Male"
                      disabled={mode === 'create' ? hasMale : (interval?.gender !== 'Male' && hasMale)}
                    >
                      Nam (Male){(mode === 'create' ? hasMale : (interval?.gender !== 'Male' && hasMale)) ? ' — [Đã có cấu hình]' : ''}
                    </option>
                    <option
                      value="Female"
                      disabled={mode === 'create' ? hasFemale : (interval?.gender !== 'Female' && hasFemale)}
                    >
                      Nữ (Female){(mode === 'create' ? hasFemale : (interval?.gender !== 'Female' && hasFemale)) ? ' — [Đã có cấu hình]' : ''}
                    </option>
                  </Form.Select>
                  <Form.Text className="text-muted small">
                    Hệ thống tự động khóa giới tính đã cấu hình để tránh trùng lặp.
                  </Form.Text>
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
          <Button variant="primary" type="submit" disabled={submitting || isDuplicate}>
            {submitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" /> Đang lưu...
              </>
            ) : isFullyConfigured && mode === 'create' ? (
              <>
                <FaBan className="me-1" /> Đã đủ 2 khoảng (1 Nam, 1 Nữ)
              </>
            ) : isDuplicate ? (
              <>
                <FaBan className="me-1" /> Giới tính này đã có cấu hình
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

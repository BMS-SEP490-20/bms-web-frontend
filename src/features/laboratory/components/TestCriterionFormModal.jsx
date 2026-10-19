/**
 * @file TestCriterionFormModal.jsx
 * @description Medical-grade modal component for creating and editing laboratory test criteria (UC18).
 * Built with React-Bootstrap Modal for robust layout, backdrop handling, and responsive medical form controls.
 * Conforms to: ISO 15189:2022, Decision 2429/QD-BYT, and AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, Card, InputGroup, Spinner } from 'react-bootstrap';
import { 
  FaVial, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaShieldAlt, 
  FaSave, 
  FaTimes, 
  FaInfoCircle,
  FaHeartbeat
} from 'react-icons/fa';

const CATEGORIES = [
  { value: 'Biochemistry', label: 'Sinh hóa máu (Biochemistry)' },
  { value: 'Hematology', label: 'Huyết học (Hematology)' },
  { value: 'Immunology', label: 'Miễn dịch học (Immunology)' },
  { value: 'BloodGas', label: 'Khí máu & Điện giải (Blood Gas)' },
  { value: 'Coagulation', label: 'Đông máu (Coagulation)' },
];

const COMMON_UNITS = [
  'mmol/L',
  'mg/dL',
  'umol/L',
  'g/L',
  'U/L',
  '%',
  'G/L',
  'T/L',
  'fL',
  'pg',
  'mEq/L',
  'S/CO',
];

export default function TestCriterionFormModal({ isOpen, mode = 'create', criterion = null, onClose, onSave }) {
  const [formData, setFormData] = useState({
    criterionCode: '',
    criterionName: '',
    englishName: '',
    category: 'Biochemistry',
    unit: 'mmol/L',
    valueType: 'Numeric',
    normalMin: '',
    normalMax: '',
    normalText: '',
    panicLow: '',
    panicHigh: '',
    isActive: true,
  });

  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (criterion && mode === 'edit') {
      setFormData({
        criterionCode: criterion.criterionCode || '',
        criterionName: criterion.criterionName || '',
        englishName: criterion.englishName || '',
        category: criterion.category || 'Biochemistry',
        unit: criterion.unit || 'mmol/L',
        valueType: criterion.valueType || 'Numeric',
        normalMin: criterion.normalMin !== null && criterion.normalMin !== undefined ? criterion.normalMin : '',
        normalMax: criterion.normalMax !== null && criterion.normalMax !== undefined ? criterion.normalMax : '',
        normalText: criterion.normalText || '',
        panicLow: criterion.panicLow !== null && criterion.panicLow !== undefined ? criterion.panicLow : '',
        panicHigh: criterion.panicHigh !== null && criterion.panicHigh !== undefined ? criterion.panicHigh : '',
        isActive: criterion.isActive !== undefined ? criterion.isActive : true,
      });
    } else {
      setFormData({
        criterionCode: '',
        criterionName: '',
        englishName: '',
        category: 'Biochemistry',
        unit: 'mmol/L',
        valueType: 'Numeric',
        normalMin: '',
        normalMax: '',
        normalText: '',
        panicLow: '',
        panicHigh: '',
        isActive: true,
      });
    }
    setValidationError('');
  }, [criterion, mode, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (validationError) setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.criterionCode.trim()) {
      setValidationError('Vui lòng nhập Mã chỉ số xét nghiệm (ví dụ: GLU, HBA1C, WBC).');
      return;
    }
    if (!formData.criterionName.trim()) {
      setValidationError('Vui lòng nhập Tên chỉ số xét nghiệm bằng tiếng Việt.');
      return;
    }

    if (formData.valueType === 'Numeric') {
      const min = formData.normalMin !== '' ? parseFloat(formData.normalMin) : null;
      const max = formData.normalMax !== '' ? parseFloat(formData.normalMax) : null;
      const pLow = formData.panicLow !== '' ? parseFloat(formData.panicLow) : null;
      const pHigh = formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null;

      if (min !== null && max !== null && min > max) {
        setValidationError(`Dải bình thường không hợp lệ: Cận dưới Min (${min}) không được lớn hơn Max (${max}).`);
        return;
      }

      if (pLow !== null && min !== null && pLow > min) {
        setValidationError(`Ngưỡng nguy kịch dưới (${pLow}) không được vượt quá cận dưới bình thường (${min}).`);
        return;
      }

      if (pHigh !== null && max !== null && pHigh < max) {
        setValidationError(`Ngưỡng nguy kịch trên (${pHigh}) không được thấp hơn cận trên bình thường (${max}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        criterionCode: formData.criterionCode.trim().toUpperCase(),
        criterionName: formData.criterionName.trim(),
        englishName: formData.englishName ? formData.englishName.trim() : '',
        category: formData.category,
        unit: formData.unit ? formData.unit.trim() : '',
        valueType: formData.valueType,
        normalMin: formData.valueType === 'Numeric' && formData.normalMin !== '' ? parseFloat(formData.normalMin) : null,
        normalMax: formData.valueType === 'Numeric' && formData.normalMax !== '' ? parseFloat(formData.normalMax) : null,
        normalText: formData.valueType === 'Qualitative' ? formData.normalText.trim() : null,
        panicLow: formData.valueType === 'Numeric' && formData.panicLow !== '' ? parseFloat(formData.panicLow) : null,
        panicHigh: formData.valueType === 'Numeric' && formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null,
        isActive: formData.isActive,
      };

      await onSave(payload);
    } catch (err) {
      setValidationError(err.message || 'Lỗi khi lưu thông tin chỉ số xét nghiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      size="lg" 
      centered 
      backdrop="static"
      keyboard={false}
      className="bms-medical-modal"
    >
      <Modal.Header closeButton className="bg-primary text-white py-3 px-4 border-0">
        <div>
          <Modal.Title className="h5 fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <FaVial className="text-warning" />
            {mode === 'create' ? 'Thêm Mới Chỉ Số Xét Nghiệm (ISO 15189)' : `Chỉnh Sửa Chỉ Số: ${formData.criterionCode}`}
          </Modal.Title>
          <small className="text-white-50">
            Định nghĩa mã danh pháp, đơn vị đo, dải tham chiếu sinh học WHO/ADA và ngưỡng báo động đỏ Panic Alert
          </small>
        </div>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {validationError && (
            <Alert variant="danger" dismissible onClose={() => setValidationError('')} className="d-flex align-items-center gap-2 mb-4">
              <FaExclamationTriangle className="flex-shrink-0" />
              <span>{validationError}</span>
            </Alert>
          )}

          {/* Section 1: Medical Identification */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <Badge bg="primary" pill className="px-2 py-1">1</Badge>
              <h6 className="fw-bold mb-0 text-dark">Thông Tin Định Danh Y Tế</h6>
              <span className="text-muted small ms-auto">(Bắt buộc theo chuẩn danh pháp y khoa)</span>
            </div>

            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Mã chỉ số (Code) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="criterionCode"
                    value={formData.criterionCode}
                    onChange={handleChange}
                    disabled={mode === 'edit'}
                    placeholder="VD: GLU, WBC, HBA1C"
                    maxLength={20}
                    required
                    style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}
                  />
                  <Form.Text className="text-muted small">Mã viết tắt chuẩn y khoa quốc tế</Form.Text>
                </Form.Group>
              </Col>

              <Col md={8}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Tên chỉ số (Tiếng Việt) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="criterionName"
                    value={formData.criterionName}
                    onChange={handleChange}
                    placeholder="VD: Glucose máu lúc đói, Định lượng Cholesterol..."
                    maxLength={150}
                    required
                  />
                  <Form.Text className="text-muted small">Tên hiển thị trên phiếu kết quả xét nghiệm</Form.Text>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Danh pháp quốc tế (English Name)</Form.Label>
                  <Form.Control
                    type="text"
                    name="englishName"
                    value={formData.englishName}
                    onChange={handleChange}
                    placeholder="VD: Fasting Blood Glucose"
                    maxLength={150}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Chuyên khoa phân loại <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Section 2: Units & Value Type */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <Badge bg="primary" pill className="px-2 py-1">2</Badge>
              <h6 className="fw-bold mb-0 text-dark">Đơn Vị Đo & Kiểu Dữ Liệu</h6>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold d-block">Kiểu giá trị đo</Form.Label>
                  <div className="d-flex gap-4 pt-1">
                    <Form.Check
                      type="radio"
                      id="type-numeric"
                      name="valueType"
                      value="Numeric"
                      label="Định lượng (Numeric / Số thực)"
                      checked={formData.valueType === 'Numeric'}
                      onChange={handleChange}
                      className="fw-medium text-dark"
                    />
                    <Form.Check
                      type="radio"
                      id="type-qualitative"
                      name="valueType"
                      value="Qualitative"
                      label="Định tính (Qualitative)"
                      checked={formData.valueType === 'Qualitative'}
                      onChange={handleChange}
                      className="fw-medium text-dark"
                    />
                  </div>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Đơn vị đo lường (Unit)</Form.Label>
                  <Form.Control
                    type="text"
                    name="unit"
                    list="common-units-list-bootstrap"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="VD: mmol/L, mg/dL, G/L..."
                  />
                  <datalist id="common-units-list-bootstrap">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Section 3: Reference Ranges & Panic Alert Limits */}
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
              <Badge bg="primary" pill className="px-2 py-1">3</Badge>
              <h6 className="fw-bold mb-0 text-dark">Dải Tham Chiếu Sinh Học & Báo Động Nguy Kịch (Panic Alert)</h6>
            </div>

            {formData.valueType === 'Numeric' ? (
              <>
                {/* Normal Biological Range */}
                <Card className="border border-success bg-success bg-opacity-10 mb-3 rounded-3 shadow-none">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <FaCheckCircle className="text-success" />
                      <span className="fw-bold text-success">Dải giá trị sinh học bình thường (Normal Range - ISO 15189)</span>
                      <small className="text-muted ms-auto">(Căn phải số liệu theo chuẩn y khoa)</small>
                    </div>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-dark">Cận dưới bình thường (Min)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="normalMin"
                            value={formData.normalMin}
                            onChange={handleChange}
                            placeholder="3.9"
                            style={{ textAlign: 'right', fontWeight: 600 }}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-dark">Cận trên bình thường (Max)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="normalMax"
                            value={formData.normalMax}
                            onChange={handleChange}
                            placeholder="6.4"
                            style={{ textAlign: 'right', fontWeight: 600 }}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Panic Alert Limits */}
                <Card className="border border-danger bg-danger bg-opacity-10 rounded-3 shadow-none">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <FaHeartbeat className="text-danger" />
                      <span className="fw-bold text-danger">Ngưỡng báo động đỏ nguy kịch (Critical Panic Alert)</span>
                      <small className="text-muted ms-auto">(Kích hoạt cờ đỏ khẩn cấp khi kết quả đe dọa tính mạng)</small>
                    </div>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-danger">
                            Nguy kịch dưới (&lt; Panic Low)
                          </Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="panicLow"
                            value={formData.panicLow}
                            onChange={handleChange}
                            placeholder="VD: 2.2"
                            style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}
                          />
                          <Form.Text className="text-muted small">Cảnh báo hạ đường huyết/điện giải nặng</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-semibold text-danger">
                            Nguy kịch trên (&gt; Panic High)
                          </Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="panicHigh"
                            value={formData.panicHigh}
                            onChange={handleChange}
                            placeholder="VD: 25.0"
                            style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}
                          />
                          <Form.Text className="text-muted small">Cảnh báo tăng đường huyết/suy tạng cấp</Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </>
            ) : (
              <Card className="border border-info bg-info bg-opacity-10 rounded-3 shadow-none">
                <Card.Body className="p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <FaInfoCircle className="text-primary" />
                    <span className="fw-bold text-primary">Giá trị bình thường chuẩn (Định tính)</span>
                  </div>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Kết quả mong đợi (Normal Text)</Form.Label>
                    <Form.Control
                      type="text"
                      name="normalText"
                      value={formData.normalText}
                      onChange={handleChange}
                      placeholder="VD: Âm tính (Negative), Không tìm thấy..."
                    />
                    <Form.Text className="text-muted small">Kết quả khác giá trị này sẽ tự động gắn cờ Bất Thường</Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            )}
          </div>

          {/* Section 4: Activation Status */}
          <div className="pt-2">
            <Form.Check
              type="switch"
              id="criterion-is-active"
              name="isActive"
              label="Kích hoạt sử dụng chỉ số này trong hệ thống phòng xét nghiệm"
              checked={formData.isActive}
              onChange={handleChange}
              className="fw-medium text-dark"
            />
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-light py-3 px-4 border-top">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting} className="px-3">
            <FaTimes className="me-1" /> Hủy Bỏ
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="px-4">
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="me-2" /> Đang Lưu...
              </>
            ) : (
              <>
                <FaSave className="me-2" /> {mode === 'create' ? 'Tạo Mới Chỉ Số' : 'Lưu Thay Đổi'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

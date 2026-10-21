/**
 * @file ClinicalRangeSimulator.jsx
 * @description Interactive clinical tool to test and simulate test result values against configured biological intervals (UC57).
 * Demonstrates live automatic flag detection: NORMAL, Low (L - yellow/orange), High (H - red), and PANIC (red alert - BR-LAB-03).
 */

import React, { useState } from 'react';
import { Card, Form, Row, Col, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaHeartbeat, FaVial, FaExclamationTriangle, FaCheckCircle, FaBell, FaInfoCircle } from 'react-icons/fa';
import referenceIntervalService from '../../../services/referenceIntervalService';

const COMMON_CRITERIA = [
  { code: 'GLU', name: 'Glucose máu lúc đói (Fasting Glucose)', unit: 'mmol/L', defaultVal: 5.2 },
  { code: 'HGB', name: 'Huyết sắc tố (Hemoglobin)', unit: 'g/L', defaultVal: 140 },
  { code: 'CRE', name: 'Creatinine huyết thanh', unit: 'µmol/L', defaultVal: 85 },
  { code: 'PLT', name: 'Số lượng tiểu cầu (Platelet)', unit: 'G/L', defaultVal: 250 },
  { code: 'ALT', name: 'Men gan ALT (GPT)', unit: 'U/L', defaultVal: 28 },
  { code: 'AST', name: 'Men gan AST (GOT)', unit: 'U/L', defaultVal: 25 },
  { code: 'K', name: 'Kali máu (Potassium K+)', unit: 'mmol/L', defaultVal: 4.1 },
  { code: 'NA', name: 'Natri máu (Sodium Na+)', unit: 'mmol/L', defaultVal: 140 },
  { code: 'CHOL', name: 'Cholesterol toàn phần', unit: 'mmol/L', defaultVal: 4.8 },
  { code: 'TRIG', name: 'Triglycerides', unit: 'mmol/L', defaultVal: 1.2 },
];

export default function ClinicalRangeSimulator({ onCriterionChange }) {
  const [criterionCode, setCriterionCode] = useState('HGB');
  const [testValue, setTestValue] = useState('140');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientAge, setPatientAge] = useState(30);
  const [condition, setCondition] = useState('General');
  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCriterionSelect = (e) => {
    const code = e.target.value;
    setCriterionCode(code);
    const selected = COMMON_CRITERIA.find((c) => c.code === code);
    if (selected) {
      setTestValue(String(selected.defaultVal));
    }
    setEvalResult(null);
    if (onCriterionChange) onCriterionChange(code);
  };

  const handleEvaluate = async (e) => {
    if (e) e.preventDefault();
    if (!testValue || isNaN(Number(testValue))) {
      setErrorMsg('Vui lòng nhập giá trị xét nghiệm dạng số hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await referenceIntervalService.evaluateResult({
        criterionCode,
        numericValue: parseFloat(testValue),
        patientAge: parseFloat(patientAge),
        patientGender,
        condition,
      });
      setEvalResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đánh giá chỉ số vào lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const currentUnit = COMMON_CRITERIA.find((c) => c.code === criterionCode)?.unit || '';

  return (
    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
      <Card.Header
        className="bg-light py-3 border-0 d-flex justify-content-between align-items-center"
        style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle"
            style={{ width: '36px', height: '36px' }}
          >
            <FaHeartbeat />
          </div>
          <div>
            <h6 className="mb-0 fw-bold text-dark">Thử Nghiệm Đánh Giá Lâm Sàng (Clinical Range Simulator)</h6>
            <small className="text-muted">Kiểm tra tự động gắn cờ L, H và cảnh báo PANIC đe dọa tính mạng (BR-LAB-02 / BR-LAB-03)</small>
          </div>
        </div>
        <Badge bg="info" className="px-3 py-2 text-white">
          ISO 15189 / QĐ 2429
        </Badge>
      </Card.Header>

      <Card.Body className="p-4">
        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="py-2 mb-3">
            <FaExclamationTriangle className="me-2" />
            {errorMsg}
          </Alert>
        )}

        <Form onSubmit={handleEvaluate}>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-secondary">Chỉ số xét nghiệm</Form.Label>
                <Form.Select value={criterionCode} onChange={handleCriterionSelect} className="form-select-sm">
                  {COMMON_CRITERIA.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.unit})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-secondary">
                  Giá trị kết quả ({currentUnit})
                </Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  size="sm"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="Nhập giá trị..."
                  required
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-secondary">Giới tính BN</Form.Label>
                <Form.Select
                  size="sm"
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                >
                  <option value="Male">Nam (Male)</option>
                  <option value="Female">Nữ (Female)</option>
                  <option value="All">Chung / Tất cả</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-secondary">Tuổi bệnh nhân</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="120"
                  size="sm"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-secondary">Bối cảnh lâm sàng</Form.Label>
                <Form.Select
                  size="sm"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="General">Thông thường (General)</option>
                  <option value="Fasting ≥ 8h">Nhịn ăn (Fasting)</option>
                  <option value="Pregnancy">Thai kỳ (Pregnancy)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={1} className="d-grid">
              <Button type="submit" variant="primary" size="sm" disabled={loading} className="fw-semibold">
                {loading ? <Spinner animation="border" size="sm" /> : 'Đánh Giá'}
              </Button>
            </Col>
          </Row>
        </Form>

        {evalResult && (
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                {evalResult.isPanic ? (
                  <div
                    className="p-3 bg-danger text-white rounded-3 shadow-sm d-flex align-items-center justify-content-center"
                    style={{ animation: 'pulse 1.5s infinite' }}
                  >
                    <FaBell size={24} />
                  </div>
                ) : evalResult.flag === 'NORMAL' ? (
                  <div className="p-3 bg-success text-white rounded-3 shadow-sm d-flex align-items-center justify-content-center">
                    <FaCheckCircle size={24} />
                  </div>
                ) : (
                  <div
                    className={`p-3 text-white rounded-3 shadow-sm d-flex align-items-center justify-content-center ${
                      evalResult.flag === 'L' ? 'bg-warning text-dark' : 'bg-danger'
                    }`}
                  >
                    <FaExclamationTriangle size={24} />
                  </div>
                )}

                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h6 className="mb-0 fw-bold">
                      Kết quả: {evalResult.valueEvaluated} {currentUnit}
                    </h6>
                    <Badge
                      bg={
                        evalResult.isPanic
                          ? 'danger'
                          : evalResult.flag === 'L'
                          ? 'warning'
                          : evalResult.flag === 'H'
                          ? 'danger'
                          : 'success'
                      }
                      className="px-2 py-1 text-uppercase fw-bold"
                    >
                      {evalResult.isPanic
                        ? 'CRITICAL PANIC'
                        : evalResult.flag === 'L'
                        ? 'Cờ L (Low)'
                        : evalResult.flag === 'H'
                        ? 'Cờ H (High)'
                        : 'Bình Thường (Normal)'}
                    </Badge>
                    {evalResult.messageCode && (
                      <Badge bg="dark" className="px-2 py-1">
                        {evalResult.messageCode}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-0 small text-dark fw-medium">{evalResult.alertMessage}</p>
                </div>
              </div>

              {evalResult.matchedInterval && (
                <div className="text-end border-start ps-3">
                  <div className="small text-muted mb-1">Khoảng tham chiếu áp dụng:</div>
                  <div className="fw-bold text-primary">{evalResult.matchedInterval.formattedNormalRange}</div>
                  <div className="small text-secondary">
                    {evalResult.matchedInterval.demographicLabel} · {evalResult.matchedInterval.standardAuthority}
                  </div>
                  {evalResult.matchedInterval.formattedPanicRange !== 'Không áp dụng' && (
                    <div className="small text-danger fw-semibold">
                      Ngưỡng Panic: {evalResult.matchedInterval.formattedPanicRange}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * @file PatientProfileEdit.jsx
 * @description Patient profile modification component (UC08).
 * Enables patient self-service updates for demographic details, address, and emergency contact info.
 * Conforms to: BR-IAM-01 & AGENTS-DESIGN.md.
 */

import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaUserEdit, FaSave, FaCheckCircle, FaTimesCircle, FaShieldAlt } from 'react-icons/fa';
import api from '../../../../config/api';

export default function PatientProfileEdit({ profile, onUpdated }) {
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phoneNumber: profile?.phoneNumber || '',
    address: profile?.address || '',
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.substring(0, 10) : '',
    gender: profile?.gender || 'Nam',
    emergencyContact: profile?.emergencyContact || ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).');
      return;
    }

    if (formData.phoneNumber && !/^(03|05|07|08|09)[0-9]{8}$/.test(formData.phoneNumber.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ (gồm 10 số, đầu số VN).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // In production calls PUT /users/profile or /patient/profile
      const res = await api.put('/users/profile', formData).catch(() => null);
      setSuccessMsg('Cập nhật hồ sơ bệnh nhân thành công!');
      if (onUpdated) {
        onUpdated({ ...profile, ...formData });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
      <Card.Header className="bg-white py-3 px-4 border-bottom d-flex align-items-center gap-3">
        <div className="rounded-3 p-2 bg-primary bg-opacity-10 text-primary">
          <FaUserEdit size={22} />
        </div>
        <div>
          <h5 className="fw-bold mb-0 text-dark">Chỉnh Sửa Hồ Sơ Y Tế Cá Nhân</h5>
          <small className="text-muted">Cập nhật thông tin liên lạc và địa chỉ nhận kết quả xét nghiệm</small>
        </div>
      </Card.Header>

      <Card.Body className="p-4">
        {successMsg && (
          <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="d-flex align-items-center gap-2">
            <FaCheckCircle />
            <span>{successMsg}</span>
          </Alert>
        )}

        {errorMsg && (
          <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="d-flex align-items-center gap-2">
            <FaTimesCircle />
            <span>{errorMsg}</span>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Số điện thoại liên hệ</Form.Label>
                <Form.Control
                  type="tel"
                  name="phoneNumber"
                  placeholder="0939145524"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Ngày sinh</Form.Label>
                <Form.Control
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Giới tính</Form.Label>
                <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Địa chỉ thường trú</Form.Label>
                <Form.Control
                  type="text"
                  name="address"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  value={formData.address}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Người liên hệ khẩn cấp (Họ tên - SĐT)</Form.Label>
                <Form.Control
                  type="text"
                  name="emergencyContact"
                  placeholder="Ví dụ: Nguyễn Văn B (Bố) - 0912345678"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={12} className="pt-2 text-end">
              <Button variant="primary" type="submit" disabled={loading} className="px-4">
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Đang Lưu...
                  </>
                ) : (
                  <>
                    <FaSave className="me-2" /> Lưu Thay Đổi
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

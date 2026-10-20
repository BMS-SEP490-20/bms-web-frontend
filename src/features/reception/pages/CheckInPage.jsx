/**
 * @file CheckInPage.jsx
 * @description Clinical Patient Directory, Walk-In Guest Registration (UC25 - Create Guest Profile),
 * @issue I2-017 | BR-078 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy
 * and Patient Information Viewer (UC30 - View Patient Information).
 * Follows the unified BMS dashboard & popup modal pattern.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Badge, Button, Form, InputGroup,
  Modal, Spinner, Alert, Pagination, Nav
} from 'react-bootstrap';
import {
  FaUserPlus, FaSearch, FaIdCard, FaUserInjured, FaPhoneAlt,
  FaTint, FaHeartbeat, FaNotesMedical, FaCalendarCheck,
  FaExclamationTriangle, FaCheckCircle, FaEye, FaSyncAlt, FaUserShield
} from 'react-icons/fa';
import {
  searchPatients,
  getPatientById,
  createGuestProfile
} from '../../../services/patientService';

const INITIAL_GUEST_FORM = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  phoneNumber: '',
  email: '',
  identityNumber: '',
  bloodType: 'Unknown',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergiesText: '',
  medicalHistory: '',
  heightCm: '',
  weightKg: '',
  bloodPressure: '',
  heartRateBpm: '',
  temperatureC: '',
  spo2Percent: ''
};

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('vi-VN');
}

function formatDateTime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString('vi-VN');
}

function formatGenderLabel(g) {
  if (!g) return 'Chưa rõ';
  const n = String(g).toLowerCase();
  if (n === 'male' || n === 'nam') return 'Nam (Male)';
  if (n === 'female' || n === 'nữ' || n === 'nu') return 'Nữ (Female)';
  return 'Khác (Other)';
}

export default function CheckInPage() {
  // List & filter state
  const [patients, setPatients] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState('ALL'); // 'ALL' | 'true' | 'false'
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [bloodTypeFilter, setBloodTypeFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick lookup by exact ID / PatientCode / CCCD
  const [quickLookupId, setQuickLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // View Patient Information Modal state (UC30)
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('summary'); // 'summary' | 'appointments' | 'records'

  // Create Guest Profile Modal state (UC25) - Only Receptionist can create guest profiles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestForm, setGuestForm] = useState(INITIAL_GUEST_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  const isReceptionist = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      if (!raw) return false;
      const u = JSON.parse(raw);
      const roleStr = String(u?.role || u?.roleName || '').toUpperCase();
      return roleStr.includes('RECEPT') || roleStr.includes('LETAN') || Number(u?.roleId) === 5;
    } catch {
      return false;
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load patients from BE
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await searchPatients({
        search: debouncedSearch || undefined,
        isGuest: guestFilter !== 'ALL' ? guestFilter : undefined,
        gender: genderFilter !== 'ALL' ? genderFilter : undefined,
        bloodType: bloodTypeFilter !== 'ALL' ? bloodTypeFilter : undefined,
        page,
        pageSize,
      });

      const items = res?.items || res?.data || [];
      setPatients(items);
      setTotalItems(res?.totalItems ?? items.length);
      setTotalPages(res?.totalPages || Math.ceil((res?.totalItems || items.length) / pageSize) || 1);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải danh sách hồ sơ bệnh nhân.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, guestFilter, genderFilter, bloodTypeFilter, page, pageSize]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Open View Patient Information Modal (UC30)
  const handleViewPatient = async (patientOrId) => {
    const id = typeof patientOrId === 'string'
      ? patientOrId
      : (patientOrId?.id || patientOrId?.patientCode || patientOrId?.identityNumber);

    if (!id) return;

    setActiveDetailTab('summary');
    setDetailError('');
    if (typeof patientOrId === 'object' && patientOrId !== null) {
      setSelectedPatient(patientOrId);
    } else {
      setSelectedPatient(null);
    }
    setShowViewModal(true);
    setDetailLoading(true);

    try {
      const fullData = await getPatientById(id);
      setSelectedPatient(fullData);
    } catch (err) {
      setDetailError(err.message || 'Không thể tải thông tin chi tiết bệnh nhân.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Quick Lookup form submit
  const handleQuickLookupSubmit = async (e) => {
    e.preventDefault();
    if (!quickLookupId.trim()) return;
    setLookupLoading(true);
    setErrorMsg('');
    try {
      const found = await getPatientById(quickLookupId.trim());
      setSelectedPatient(found);
      setActiveDetailTab('summary');
      setDetailError('');
      setShowViewModal(true);
    } catch (err) {
      setErrorMsg(`Tra cứu "${quickLookupId.trim()}": ${err.message}`);
    } finally {
      setLookupLoading(false);
    }
  };

  // Live duplicate check when typing identityNumber or phoneNumber in Create Guest Modal (UC25)
  useEffect(() => {
    if (!showCreateModal) return;
    const query = guestForm.identityNumber.trim() || guestForm.phoneNumber.trim() || guestForm.fullName.trim();
    if (!query || query.length < 4) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await searchPatients({ search: query, page: 1, pageSize: 3 });
        setDuplicateMatches(res?.items || []);
        setIgnoreDuplicate(false);
      } catch {
        setDuplicateMatches([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [showCreateModal, guestForm.identityNumber, guestForm.phoneNumber, guestForm.fullName]);

  const handleOpenCreateGuestModal = () => {
    if (!isReceptionist) {
      setErrorMsg('Chỉ tài khoản Lễ Tân (Receptionist) mới được phép tạo hồ sơ khách vãng lai (Create Guest Profile).');
      return;
    }
    setGuestForm(INITIAL_GUEST_FORM);
    setCreateError('');
    setDuplicateMatches([]);
    setIgnoreDuplicate(false);
    setShowCreateModal(true);
  };

  const handleGuestFieldChange = (field, value) => {
    setGuestForm(prev => ({ ...prev, [field]: value }));
  };

  // Submit Create Guest Profile (POST /api/patients/guests)
  const handleCreateGuestSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!guestForm.fullName.trim() || guestForm.fullName.trim().length < 2) {
      setCreateError('Vui lòng nhập họ và tên bệnh nhân (tối thiểu 2 ký tự).');
      return;
    }
    if (!guestForm.dateOfBirth) {
      setCreateError('Vui lòng chọn ngày sinh của bệnh nhân.');
      return;
    }
    const dobDate = new Date(guestForm.dateOfBirth);
    if (dobDate > new Date()) {
      setCreateError('Ngày sinh không được lớn hơn ngày hiện tại.');
      return;
    }
    const phoneClean = guestForm.phoneNumber.trim();
    if (!/^(\+84|0)[0-9]{8,10}$/.test(phoneClean)) {
      setCreateError('Số điện thoại không hợp lệ (Chuẩn VN: 0xxxxxxxxx hoặc +84xxxxxxxxx).');
      return;
    }
    const idCardClean = guestForm.identityNumber.trim();
    if (idCardClean && !/^[0-9]{9,12}$/.test(idCardClean)) {
      setCreateError('Số CCCD / CMND phải gồm từ 9 đến 12 chữ số.');
      return;
    }
    const emergPhoneClean = guestForm.emergencyContactPhone.trim();
    if (emergPhoneClean && !/^(\+84|0)[0-9]{8,10}$/.test(emergPhoneClean)) {
      setCreateError('Số điện thoại liên hệ khẩn cấp không đúng định dạng.');
      return;
    }

    const allergies = guestForm.allergiesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const hasVitals =
      guestForm.heightCm !== '' ||
      guestForm.weightKg !== '' ||
      guestForm.bloodPressure.trim() !== '' ||
      guestForm.heartRateBpm !== '' ||
      guestForm.temperatureC !== '' ||
      guestForm.spo2Percent !== '';

    const payload = {
      fullName: guestForm.fullName.trim(),
      dateOfBirth: new Date(guestForm.dateOfBirth + 'T00:00:00Z').toISOString(),
      gender: guestForm.gender,
      phoneNumber: phoneClean,
      email: guestForm.email.trim() || null,
      identityNumber: idCardClean || null,
      bloodType: guestForm.bloodType || 'Unknown',
      address: guestForm.address.trim() || null,
      emergencyContactName: guestForm.emergencyContactName.trim() || null,
      emergencyContactPhone: emergPhoneClean || null,
      medicalHistory: guestForm.medicalHistory.trim() || null,
      allergies: allergies.length > 0 ? allergies : null,
      vitals: hasVitals
        ? {
            heightCm: guestForm.heightCm !== '' ? Number(guestForm.heightCm) : null,
            weightKg: guestForm.weightKg !== '' ? Number(guestForm.weightKg) : null,
            bloodPressure: guestForm.bloodPressure.trim() || null,
            heartRateBpm: guestForm.heartRateBpm !== '' ? Number(guestForm.heartRateBpm) : null,
            temperatureC: guestForm.temperatureC !== '' ? Number(guestForm.temperatureC) : null,
            spo2Percent: guestForm.spo2Percent !== '' ? Number(guestForm.spo2Percent) : null,
          }
        : null,
    };

    setCreateLoading(true);
    try {
      const created = await createGuestProfile(payload);
      setShowCreateModal(false);
      setSuccessMsg(
        `Đã tạo hồ sơ khách vãng lai thành công: ${created.fullName} (Mã BN: ${created.patientCode || created.id})`
      );
      await loadPatients();
      // Open the newly created patient's detail popup immediately for verification
      setSelectedPatient(created);
      setActiveDetailTab('summary');
      setShowViewModal(true);
    } catch (err) {
      setCreateError(err.message || 'Không thể tạo hồ sơ khách vãng lai.');
    } finally {
      setCreateLoading(false);
    }
  };

  const guestCount = patients.filter(p => p.isGuest).length;
  const registeredCount = patients.filter(p => !p.isGuest).length;

  return (
    <div className="container-fluid py-3">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaUserInjured className="text-primary" />
            <span>Quản Lý Hồ Sơ Bệnh Nhân & Tiếp Nhận Khách Vãng Lai</span>
          </h3>
          <p className="text-muted small mb-0">
            Tra cứu thông tin định danh, sinh hiệu, lịch sử khám (UC30) và khởi tạo hồ sơ khách vãng lai Walk-in (UC25).
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={loadPatients} disabled={loading}>
            <FaSyncAlt className="me-1" /> Làm mới
          </Button>
          {isReceptionist && (
            <Button variant="primary" className="fw-semibold" onClick={handleOpenCreateGuestModal}>
              <FaUserPlus className="me-2" /> + Tạo Hồ Sơ Khách (Guest Profile)
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="mb-3">
          <FaCheckCircle className="me-2" />
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="mb-3">
          <FaExclamationTriangle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      {/* KPI Summary & Quick ID/CCCD Lookup Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small">Tổng Hồ Sơ Tìm Thấy</div>
                <div className="fs-3 fw-bold text-primary">{totalItems}</div>
                <div className="text-muted" style={{ fontSize: '11px' }}>Đang hiển thị {patients.length} hồ sơ</div>
              </div>
              <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3 fs-4">
                <FaIdCard />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={2}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-3">
              <div className="text-muted small">Khách Vãng Lai (Guest)</div>
              <div className="fs-3 fw-bold text-warning">{guestCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>Trên trang hiện tại</div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={2}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="p-3">
              <div className="text-muted small">Đã Có Tài Khoản</div>
              <div className="fs-3 fw-bold text-success">{registeredCount}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>Trên trang hiện tại</div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary bg-opacity-10">
            <Card.Body className="p-3">
              <div className="fw-bold small text-dark mb-2">
                <FaUserShield className="me-1 text-primary" />
                Tra Cứu Nhanh Hồ Sơ Theo Mã BN / ID / CCCD (UC30):
              </div>
              <Form onSubmit={handleQuickLookupSubmit}>
                <InputGroup size="sm">
                  <Form.Control
                    type="text"
                    placeholder="Nhập Mã BN (BN-...), ID (PAT-...) hoặc số CCCD 12 số..."
                    value={quickLookupId}
                    onChange={(e) => setQuickLookupId(e.target.value)}
                    className="bg-white"
                  />
                  <Button type="submit" variant="primary" disabled={lookupLoading || !quickLookupId.trim()}>
                    {lookupLoading ? <Spinner animation="border" size="sm" /> : <><FaEye className="me-1" /> Xem Hồ Sơ</>}
                  </Button>
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search & Filter Toolbar Card */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted">
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo Họ tên, Mã BN, Số điện thoại, CCCD hoặc Email..."
                  className="border-start-0"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col xs={6} md={3}>
              <Form.Select
                value={guestFilter}
                onChange={(e) => {
                  setGuestFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Tất cả loại hồ sơ</option>
                <option value="true">Khách vãng lai (Guest Profile)</option>
                <option value="false">Bệnh nhân có tài khoản</option>
              </Form.Select>
            </Col>

            <Col xs={6} md={2}>
              <Form.Select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Mọi giới tính</option>
                <option value="Male">Nam (Male)</option>
                <option value="Female">Nữ (Female)</option>
                <option value="Other">Khác (Other)</option>
              </Form.Select>
            </Col>

            <Col xs={12} md={2}>
              <Form.Select
                value={bloodTypeFilter}
                onChange={(e) => {
                  setBloodTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Mọi nhóm máu</option>
                <option value="O+">Nhóm máu O+</option>
                <option value="A+">Nhóm máu A+</option>
                <option value="B+">Nhóm máu B+</option>
                <option value="AB+">Nhóm máu AB+</option>
                <option value="O-">Nhóm máu O-</option>
                <option value="A-">Nhóm máu A-</option>
                <option value="B-">Nhóm máu B-</option>
                <option value="AB-">Nhóm máu AB-</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Patient Directory Table Card */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Mã Hồ Sơ</th>
                <th>Họ và Tên Bệnh Nhân</th>
                <th>Phân Loại</th>
                <th>Ngày Sinh / Giới Tính</th>
                <th>Số Điện Thoại</th>
                <th>Số CCCD / CMND</th>
                <th className="text-center">Nhóm Máu</th>
                <th className="text-end pe-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span className="text-muted">Đang tải danh sách hồ sơ bệnh nhân...</span>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <FaUserInjured className="fs-2 d-block mx-auto mb-2 opacity-50" />
                    Không tìm thấy hồ sơ bệnh nhân nào phù hợp. Bạn có thể tạo mới Hồ Sơ Khách Vãng Lai (Guest Profile).
                  </td>
                </tr>
              ) : (
                patients.map((pt) => (
                  <tr key={pt.id || pt.patientCode}>
                    <td className="ps-4">
                      <div className="fw-bold font-monospace text-primary">{pt.patientCode || pt.id}</div>
                      <small className="text-muted font-monospace">{pt.id}</small>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{pt.fullName}</div>
                      {pt.email && <small className="text-muted">{pt.email}</small>}
                    </td>
                    <td>
                      {pt.isGuest ? (
                        <Badge bg="warning" text="dark" className="px-2 py-1">
                          Khách vãng lai (Guest)
                        </Badge>
                      ) : (
                        <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle px-2 py-1">
                          Thành viên chính thức
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div>{formatDate(pt.dateOfBirth)} ({pt.age ?? '—'} tuổi)</div>
                      <small className="text-muted">{formatGenderLabel(pt.gender)}</small>
                    </td>
                    <td className="font-monospace">{pt.phoneNumber || '—'}</td>
                    <td className="font-monospace">{pt.identityNumber || '—'}</td>
                    <td className="text-center">
                      <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger-subtle px-2 py-1">
                        <FaTint className="me-1" />
                        {pt.bloodType || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="text-end pe-4">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewPatient(pt)}
                      >
                        <FaEye className="me-1" /> Xem Chi Tiết
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="card-footer bg-light border-top p-3 d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng {totalItems} hồ sơ)
            </small>
            <Pagination size="sm" className="m-0">
              <Pagination.Prev disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                <Pagination.Item key={pNum} active={pNum === page} onClick={() => setPage(pNum)}>
                  {pNum}
                </Pagination.Item>
              ))}
              <Pagination.Next disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />
            </Pagination>
          </div>
        )}
      </Card>

      {/* =====================================================================
          POPUP 1: CREATE GUEST PROFILE MODAL (UC25 - POST /api/patients/guests)
         ===================================================================== */}
      <Modal
        show={showCreateModal}
        onHide={() => !createLoading && setShowCreateModal(false)}
        centered
        size="lg"
        backdrop="static"
      >
        <Form onSubmit={handleCreateGuestSubmit}>
          <Modal.Header closeButton={!createLoading} className="bg-light border-bottom">
            <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2 mb-0">
              <FaUserPlus className="text-primary" />
              <span>Tạo Hồ Sơ Bệnh Nhân Khách Vãng Lai (Create Guest Profile - UC25)</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
            <Alert variant="info" className="py-2 px-3 small mb-3">
              <strong>Hồ sơ khách vãng lai (Guest Profile):</strong> Dành cho bệnh nhân đến trực tiếp phòng khám chưa có tài khoản BMS. Hồ sơ có thể liên kết với tài khoản chính thức sau này.
            </Alert>

            {createError && (
              <Alert variant="danger" dismissible onClose={() => setCreateError('')} className="py-2 px-3 small mb-3">
                <FaExclamationTriangle className="me-2" />
                {createError}
              </Alert>
            )}

            {/* Live Duplicate Check Warning (matching screens/03-receptionist.html #uc25) */}
            {duplicateMatches.length > 0 && !ignoreDuplicate && (
              <Alert variant="warning" className="mb-3 border-warning">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold small mb-1">
                      <FaExclamationTriangle className="me-1" />
                      Phát hiện {duplicateMatches.length} hồ sơ có khả năng trùng lặp trong hệ thống:
                    </div>
                    {duplicateMatches.map((m) => (
                      <div key={m.id} className="small bg-white p-2 rounded border mb-1 d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{m.fullName}</strong> · <span className="font-monospace">{m.patientCode || m.id}</span> · SĐT: {m.phoneNumber} · CCCD: {m.identityNumber || '—'}
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setShowCreateModal(false);
                            handleViewPatient(m);
                          }}
                        >
                          Dùng hồ sơ này
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="link" size="sm" className="text-muted p-0 ms-2" onClick={() => setIgnoreDuplicate(true)}>
                    Bỏ qua
                  </Button>
                </div>
              </Alert>
            )}

            {/* 1. Identity & Demographics */}
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">1. Thông Tin Định Danh Cơ Bản</h6>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="VD: Hoàng Văn Kiên"
                    required
                    value={guestForm.fullName}
                    onChange={(e) => handleGuestFieldChange('fullName', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Số CCCD / CMND (9–12 chữ số)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="VD: 079192000456"
                    maxLength={12}
                    value={guestForm.identityNumber}
                    onChange={(e) => handleGuestFieldChange('identityNumber', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ngày sinh <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={guestForm.dateOfBirth}
                    onChange={(e) => handleGuestFieldChange('dateOfBirth', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giới tính <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={guestForm.gender}
                    onChange={(e) => handleGuestFieldChange('gender', e.target.value)}
                  >
                    <option value="Male">Nam (Male)</option>
                    <option value="Female">Nữ (Female)</option>
                    <option value="Other">Khác (Other)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nhóm máu (ABO/Rh)</Form.Label>
                  <Form.Select
                    value={guestForm.bloodType}
                    onChange={(e) => handleGuestFieldChange('bloodType', e.target.value)}
                  >
                    <option value="Unknown">Chưa xác định (Unknown)</option>
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* 2. Contact & Emergency */}
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">2. Thông Tin Liên Hệ & Khẩn Cấp</h6>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Số điện thoại <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="VD: 0901234567"
                    required
                    value={guestForm.phoneNumber}
                    onChange={(e) => handleGuestFieldChange('phoneNumber', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Email nhận kết quả (Tùy chọn)</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="patient@example.com"
                    value={guestForm.email}
                    onChange={(e) => handleGuestFieldChange('email', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Địa chỉ hiện tại</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                    value={guestForm.address}
                    onChange={(e) => handleGuestFieldChange('address', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Người liên hệ khẩn cấp</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Họ tên & quan hệ (VD: Hoàng Thị Thúy - Vợ)"
                    value={guestForm.emergencyContactName}
                    onChange={(e) => handleGuestFieldChange('emergencyContactName', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">SĐT liên hệ khẩn cấp</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="VD: 0908777123"
                    value={guestForm.emergencyContactPhone}
                    onChange={(e) => handleGuestFieldChange('emergencyContactPhone', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* 3. Clinical Notes & Vitals */}
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">3. Chỉ Số Sinh Hiệu & Tiền Sử Y Khoa (Tùy Chọn)</h6>
            <Row className="g-2 mb-3">
              <Col xs={6} md={2}>
                <Form.Label className="small">Chiều cao (cm)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="20"
                  max="260"
                  placeholder="170"
                  value={guestForm.heightCm}
                  onChange={(e) => handleGuestFieldChange('heightCm', e.target.value)}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="small">Cân nặng (kg)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="400"
                  placeholder="65"
                  value={guestForm.weightKg}
                  onChange={(e) => handleGuestFieldChange('weightKg', e.target.value)}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="small">Huyết áp</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="120/80"
                  value={guestForm.bloodPressure}
                  onChange={(e) => handleGuestFieldChange('bloodPressure', e.target.value)}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="small">Nhịp tim (bpm)</Form.Label>
                <Form.Control
                  type="number"
                  min="20"
                  max="260"
                  placeholder="75"
                  value={guestForm.heartRateBpm}
                  onChange={(e) => handleGuestFieldChange('heartRateBpm', e.target.value)}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="small">Nhiệt độ (°C)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  placeholder="36.8"
                  value={guestForm.temperatureC}
                  onChange={(e) => handleGuestFieldChange('temperatureC', e.target.value)}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label className="small">SpO2 (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="50"
                  max="100"
                  placeholder="98"
                  value={guestForm.spo2Percent}
                  onChange={(e) => handleGuestFieldChange('spo2Percent', e.target.value)}
                />
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tiền sử dị ứng (Cách nhau bằng dấu phẩy)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="VD: Penicillin, Hải sản, Latex..."
                    value={guestForm.allergiesText}
                    onChange={(e) => handleGuestFieldChange('allergiesText', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ghi chú bệnh sử / Thuốc đang dùng</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="VD: Đái tháo đường tuýp 2, đang dùng Metformin..."
                    value={guestForm.medicalHistory}
                    onChange={(e) => handleGuestFieldChange('medicalHistory', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer className="bg-light border-top">
            <Button variant="outline-secondary" onClick={() => setShowCreateModal(false)} disabled={createLoading}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={createLoading}>
              {createLoading ? (
                <><Spinner animation="border" size="sm" className="me-2" /> Đang lưu hồ sơ...</>
              ) : (
                <><FaUserPlus className="me-1" /> Lưu Hồ Sơ Khách Vãng Lai</>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =====================================================================
          POPUP 2: VIEW PATIENT INFORMATION MODAL (UC30 - GET /api/patients/{id})
         ===================================================================== */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="xl"
      >
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2 mb-0">
            <FaIdCard className="text-primary" />
            <span>Hồ Sơ Chi Tiết Bệnh Nhân (View Patient Information - UC30)</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {detailError && (
            <Alert variant="danger" className="mb-3">
              <FaExclamationTriangle className="me-2" />
              {detailError}
            </Alert>
          )}

          {detailLoading && !selectedPatient ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted">Đang tải hồ sơ y tế bệnh nhân...</div>
            </div>
          ) : selectedPatient ? (
            <>
              {/* Patient Identity Banner (matching screens/04-doctor.html #uc30) */}
              <div className="p-3 rounded-4 border mb-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: '#fff' }}>
                <Row className="align-items-center g-3">
                  <Col xs={12} md={6}>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4 flex-shrink-0"
                        style={{ width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        {selectedPatient.fullName ? selectedPatient.fullName.trim().split(' ').slice(-1)[0][0]?.toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <h4 className="fw-bold mb-0 text-white">{selectedPatient.fullName}</h4>
                          {selectedPatient.isGuest ? (
                            <Badge bg="warning" text="dark">Khách vãng lai (Guest)</Badge>
                          ) : (
                            <Badge bg="success">Bệnh nhân chính thức</Badge>
                          )}
                        </div>
                        <div className="small text-white-50 font-monospace mt-1">
                          Mã BN: <strong className="text-white">{selectedPatient.patientCode || selectedPatient.id}</strong>
                          {' · '}ID: {selectedPatient.id}
                          {' · '}{formatGenderLabel(selectedPatient.gender)}
                          {' · '}{formatDate(selectedPatient.dateOfBirth)} ({selectedPatient.age ?? '—'} tuổi)
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          <Badge bg="danger" className="px-2 py-1">
                            <FaTint className="me-1" /> Nhóm máu: {selectedPatient.bloodType || 'Unknown'}
                          </Badge>
                          {selectedPatient.allergies?.length > 0 ? (
                            <Badge bg="warning" text="dark" className="px-2 py-1">
                              <FaExclamationTriangle className="me-1" />
                              Dị ứng: {selectedPatient.allergies.join(', ')}
                            </Badge>
                          ) : (
                            <Badge bg="secondary" className="px-2 py-1">Không ghi nhận dị ứng</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={12} md={6}>
                    <Row className="g-2 small text-white-50">
                      <Col xs={6}>
                        <div>Số điện thoại:</div>
                        <div className="fw-bold text-white font-monospace">{selectedPatient.phoneNumber || '—'}</div>
                      </Col>
                      <Col xs={6}>
                        <div>Số CCCD / Định danh:</div>
                        <div className="fw-bold text-white font-monospace">{selectedPatient.identityNumber || '—'}</div>
                      </Col>
                      <Col xs={6}>
                        <div>Email:</div>
                        <div className="fw-bold text-white text-truncate">{selectedPatient.email || '—'}</div>
                      </Col>
                      <Col xs={6}>
                        <div>Ngày lập hồ sơ:</div>
                        <div className="fw-bold text-white">{formatDate(selectedPatient.createdAt)}</div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </div>

              {/* Navigation Tabs inside Modal */}
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link
                    active={activeDetailTab === 'summary'}
                    onClick={() => setActiveDetailTab('summary')}
                    className="fw-semibold"
                  >
                    <FaHeartbeat className="me-1 text-danger" /> Thông Tin Hành Chính & Sinh Hiệu
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeDetailTab === 'appointments'}
                    onClick={() => setActiveDetailTab('appointments')}
                    className="fw-semibold"
                  >
                    <FaCalendarCheck className="me-1 text-primary" /> Lịch Hẹn & Phiếu Xét Nghiệm ({selectedPatient.recentAppointments?.length || 0})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeDetailTab === 'records'}
                    onClick={() => setActiveDetailTab('records')}
                    className="fw-semibold"
                  >
                    <FaNotesMedical className="me-1 text-success" /> Bệnh Án & Ghi Chú Lâm Sàng ({selectedPatient.recentMedicalRecords?.length || 0})
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              {/* Tab 1: Demographics, Vitals & Medical History */}
              {activeDetailTab === 'summary' && (
                <Row className="g-3">
                  <Col md={6}>
                    <Card className="border shadow-sm rounded-3 h-100">
                      <Card.Header className="bg-light fw-bold small">Thông Tin Hành Chính & Liên Hệ</Card.Header>
                      <Card.Body className="small">
                        <Row className="gy-2">
                          <Col xs={5} className="text-muted">Họ và tên:</Col>
                          <Col xs={7} className="fw-bold">{selectedPatient.fullName}</Col>

                          <Col xs={5} className="text-muted">Mã bệnh nhân:</Col>
                          <Col xs={7} className="font-monospace">{selectedPatient.patientCode || selectedPatient.id}</Col>

                          <Col xs={5} className="text-muted">Ngày sinh / Tuổi:</Col>
                          <Col xs={7}>{formatDate(selectedPatient.dateOfBirth)} ({selectedPatient.age ?? '—'} tuổi)</Col>

                          <Col xs={5} className="text-muted">Giới tính:</Col>
                          <Col xs={7}>{formatGenderLabel(selectedPatient.gender)}</Col>

                          <Col xs={5} className="text-muted">Số CCCD / CMND:</Col>
                          <Col xs={7} className="font-monospace">{selectedPatient.identityNumber || 'Chưa cập nhật'}</Col>

                          <Col xs={5} className="text-muted">Số điện thoại:</Col>
                          <Col xs={7} className="font-monospace">{selectedPatient.phoneNumber || '—'}</Col>

                          <Col xs={5} className="text-muted">Địa chỉ thường trú:</Col>
                          <Col xs={7}>{selectedPatient.address || 'Chưa cập nhật'}</Col>

                          <Col xs={5} className="text-muted">Liên hệ khẩn cấp:</Col>
                          <Col xs={7}>
                            {selectedPatient.emergencyContactName || '—'}
                            {selectedPatient.emergencyContactPhone ? ` (${selectedPatient.emergencyContactPhone})` : ''}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <Card className="border shadow-sm rounded-3 h-100">
                      <Card.Header className="bg-light fw-bold small">Chỉ Số Sinh Hiệu (Vitals) & Tiền Sử</Card.Header>
                      <Card.Body className="small">
                        <Row className="g-2 mb-3 text-center">
                          <Col xs={4}>
                            <div className="p-2 bg-light rounded border">
                              <div className="text-muted" style={{ fontSize: '11px' }}>Chiều cao / Cân nặng</div>
                              <div className="fw-bold text-dark">
                                {selectedPatient.vitals?.heightCm || '—'} cm / {selectedPatient.vitals?.weightKg || '—'} kg
                              </div>
                            </div>
                          </Col>
                          <Col xs={4}>
                            <div className="p-2 bg-light rounded border">
                              <div className="text-muted" style={{ fontSize: '11px' }}>Huyết áp / Nhịp tim</div>
                              <div className="fw-bold text-primary">
                                {selectedPatient.vitals?.bloodPressure || '—'} · {selectedPatient.vitals?.heartRateBpm || '—'} bpm
                              </div>
                            </div>
                          </Col>
                          <Col xs={4}>
                            <div className="p-2 bg-light rounded border">
                              <div className="text-muted" style={{ fontSize: '11px' }}>Nhiệt độ / SpO2</div>
                              <div className="fw-bold text-success">
                                {selectedPatient.vitals?.temperatureC || '—'} °C · {selectedPatient.vitals?.spo2Percent || '—'}%
                              </div>
                            </div>
                          </Col>
                        </Row>

                        <div className="mb-2">
                          <div className="text-muted mb-1">Tiền sử dị ứng:</div>
                          <div className="p-2 bg-light rounded border">
                            {selectedPatient.allergies?.length > 0
                              ? selectedPatient.allergies.join(', ')
                              : 'Không ghi nhận tiền sử dị ứng.'}
                          </div>
                        </div>

                        <div>
                          <div className="text-muted mb-1">Bệnh sử & Ghi chú y khoa:</div>
                          <div className="p-2 bg-light rounded border">
                            {selectedPatient.medicalHistory || 'Không có ghi chú bệnh lý nền.'}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Tab 2: Recent Appointments */}
              {activeDetailTab === 'appointments' && (
                <div className="table-responsive border rounded-3">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Mã Lịch Hẹn</th>
                        <th>Ngày Hẹn</th>
                        <th>Khung Giờ</th>
                        <th>Gói Xét Nghiệm / Dịch Vụ</th>
                        <th>Trạng Thái</th>
                        <th>Thanh Toán</th>
                        <th className="text-end pe-3">Tổng Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedPatient.recentAppointments || selectedPatient.recentAppointments.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            Chưa có lịch sử đặt lịch xét nghiệm cho bệnh nhân này.
                          </td>
                        </tr>
                      ) : (
                        selectedPatient.recentAppointments.map((apt) => (
                          <tr key={apt.appointmentId}>
                            <td className="ps-3 font-monospace fw-bold text-primary">{apt.appointmentId}</td>
                            <td>{formatDate(apt.appointmentDate)}</td>
                            <td>{apt.timeSlot || '—'}</td>
                            <td className="fw-medium">{apt.servicePackageName || 'Xét nghiệm lâm sàng'}</td>
                            <td><Badge bg="info" text="dark">{apt.status}</Badge></td>
                            <td><Badge bg={apt.paymentStatus === 'Paid' ? 'success' : 'secondary'}>{apt.paymentStatus || 'Unpaid'}</Badge></td>
                            <td className="text-end pe-3 font-monospace">
                              {apt.totalAmount != null ? `${Number(apt.totalAmount).toLocaleString('vi-VN')} ₫` : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Tab 3: Recent Medical Records */}
              {activeDetailTab === 'records' && (
                <div className="table-responsive border rounded-3">
                  <Table hover size="sm" className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Mã Bệnh Án</th>
                        <th>Ngày Khám</th>
                        <th>Bác Sĩ Phụ Trách</th>
                        <th>Chẩn Đoán Lâm Sàng</th>
                        <th>Ghi Chú & Khuyến Nghị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedPatient.recentMedicalRecords || selectedPatient.recentMedicalRecords.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            Chưa có hồ sơ bệnh án hoặc nhận định bác sĩ nào được lưu.
                          </td>
                        </tr>
                      ) : (
                        selectedPatient.recentMedicalRecords.map((rec) => (
                          <tr key={rec.recordId}>
                            <td className="ps-3 font-monospace fw-bold">{rec.recordId}</td>
                            <td>{formatDateTime(rec.visitDate)}</td>
                            <td>{rec.doctorName || 'Bác sĩ chuyên khoa'}</td>
                            <td className="fw-semibold text-dark">{rec.diagnosis || '—'}</td>
                            <td className="small text-secondary">
                              <div>{rec.clinicalNotes}</div>
                              {rec.recommendations && (
                                <div className="text-primary mt-1"><strong>Khuyến nghị:</strong> {rec.recommendations}</div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          ) : null}
        </Modal.Body>

        <Modal.Footer className="bg-light border-top">
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

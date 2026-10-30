/**
 * @file ConfigureReferenceIntervalsPage.jsx
 * @description UC57 – Biological Reference Intervals Configuration & Management Web Interface.
 * Complies with:
 * - BR-LAB-02: Biological Reference Intervals & automatic clinical flagging (L / H).
 * - BR-LAB-03: Panic Critical Values alert thresholds (< 40 or > 450 Glucose, < 2.5 or > 6.5 K+, etc.).
 * - ISO 15189:2022 & Decision 2429/QD-BYT standards.
 * - AGENTS-DESIGN.md: Right-aligned numerical ranges, standard badges, responsive Bootstrap layout.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, InputGroup, Pagination, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaHeartbeat,
  FaPlus,
  FaSearch,
  FaFilter,
  FaEdit,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFlask,
  FaSlidersH,
  FaArrowLeft,
  FaVial,
  FaInfoCircle,
} from 'react-icons/fa';
import referenceIntervalService from '../../../services/referenceIntervalService';
import ReferenceIntervalModal from '../components/ReferenceIntervalModal';
import ClinicalRangeSimulator from '../components/ClinicalRangeSimulator';
import { getStoredUser, hasRole, ROLES } from '../../../constants/roles';

export default function ConfigureReferenceIntervalsPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canConfigureIntervals = hasRole(currentUser, ROLES.ADMIN, ROLES.LAB, ROLES.MANAGER);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCriterionParam = searchParams.get('criterion') || '';

  const [intervals, setIntervals] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 1,
  });

  const [searchCode, setSearchCode] = useState(initialCriterionParam);
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    interval: null,
  });

  // Simulator toggle
  const [showSimulator, setShowSimulator] = useState(true);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchIntervals = useCallback(
    async (page = 1, code = searchCode, gender = selectedGender, status = statusFilter) => {
      try {
        setLoading(true);
        let isActiveParam = null;
        if (status === 'ACTIVE') isActiveParam = true;
        if (status === 'INACTIVE') isActiveParam = false;

        const result = await referenceIntervalService.getIntervals({
          page,
          pageSize: pagination.pageSize,
          criterionCode: code,
          gender: gender === 'ALL' ? '' : gender,
          isActive: isActiveParam,
        });

        setIntervals(result.items || []);
        setPagination({
          currentPage: result.currentPage || page,
          pageSize: result.pageSize || 15,
          totalCount: result.totalCount || 0,
          totalPages: result.totalPages || 1,
        });
      } catch (err) {
        showToast(err.message || 'Không thể tải danh sách khoảng tham chiếu.', 'danger');
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize, searchCode, selectedGender, statusFilter]
  );

  useEffect(() => {
    fetchIntervals(1, searchCode, selectedGender, statusFilter);
  }, [fetchIntervals, searchCode, selectedGender, statusFilter]);

  const handleOpenCreateModal = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      interval: null,
    });
  };

  const handleOpenEditModal = (interval) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      interval,
    });
  };

  const handleSaveInterval = async (payload, id) => {
    if (modalState.mode === 'create') {
      await referenceIntervalService.createInterval(payload);
      showToast('Đã thêm mới khoảng tham chiếu sinh học thành công!');
    } else {
      await referenceIntervalService.updateInterval(id, payload);
      showToast('Đã cập nhật khoảng tham chiếu thành công!');
    }
    fetchIntervals(pagination.currentPage);
  };

  const handleToggleActive = async (interval) => {
    if (!canConfigureIntervals) return;
    if (interval.isActive) {
      try {
        await referenceIntervalService.deactivateInterval(interval.id);
        showToast('Đã khóa khoảng tham chiếu an toàn.');
        fetchIntervals(pagination.currentPage);
      } catch (err) {
        showToast(err.message || 'Lỗi khi khóa khoảng tham chiếu.', 'danger');
      }
    } else {
      try {
        await referenceIntervalService.updateInterval(interval.id, {
          criterionName: interval.criterionName,
          unit: interval.unit,
          gender: interval.gender,
          ageMin: interval.ageMin,
          ageMax: interval.ageMax,
          ageUnit: interval.ageUnit,
          demographicLabel: interval.demographicLabel,
          normalMin: interval.normalMin,
          normalMax: interval.normalMax,
          normalText: interval.normalText,
          panicLow: interval.panicLow,
          panicHigh: interval.panicHigh,
          condition: interval.condition,
          standardAuthority: interval.standardAuthority,
          notes: interval.notes,
          isActive: true,
        });
        showToast('Đã kích hoạt lại khoảng tham chiếu thành công!');
        fetchIntervals(pagination.currentPage);
      } catch (err) {
        showToast(err.message || 'Lỗi khi kích hoạt lại khoảng tham chiếu.', 'danger');
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchIntervals(newPage);
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Toast Notification */}
      {toast && (
        <Alert
          variant={toast.type}
          dismissible
          onClose={() => setToast(null)}
          className="position-fixed top-0 end-0 m-3 shadow-lg z-3"
          style={{ minWidth: '320px' }}
        >
          {toast.type === 'success' ? (
            <FaCheckCircle className="me-2" />
          ) : (
            <FaExclamationTriangle className="me-2" />
          )}
          {toast.message}
        </Alert>
      )}

      {/* Header Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => navigate('/criteria')}
              className="d-flex align-items-center gap-1 me-2"
            >
              <FaArrowLeft /> Danh Mục Chỉ Số
            </Button>
            <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <FaHeartbeat className="text-danger" />
              Cấu Hình Khoảng Tham Chiếu Sinh Học (UC57)
            </h4>
            <Badge bg="primary" className="ms-2">
              Iteration 3
            </Badge>
            <Badge bg="success">BR-LAB-02 / BR-LAB-03</Badge>
          </div>
          <p className="text-muted small mb-0">
            Quản trị dải tham chiếu bình thường theo Độ tuổi & Giới tính và Ngưỡng báo động nguy hiểm (PANIC Values) theo chuẩn Bộ Y Tế & WHO.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant={showSimulator ? 'outline-primary' : 'primary'}
            size="sm"
            onClick={() => setShowSimulator(!showSimulator)}
            className="d-flex align-items-center gap-2 fw-semibold"
          >
            <FaFlask />
            {showSimulator ? 'Ẩn Thử Nghiệm' : 'Mở Thử Nghiệm Lâm Sàng'}
          </Button>

          {canConfigureIntervals && (
            <Button
              variant="success"
              size="sm"
              onClick={handleOpenCreateModal}
              className="d-flex align-items-center gap-2 fw-semibold shadow-sm"
            >
              <FaPlus /> Thêm Khoảng Tham Chiếu Mới
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Clinical Range Simulator */}
      {showSimulator && (
        <ClinicalRangeSimulator
          onCriterionChange={(code) => {
            setSearchCode(code);
          }}
        />
      )}

      {/* Filter Toolbar */}
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={4}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo mã chỉ số (HGB, GLU, CRE...)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>

            <Col md={3}>
              <div className="d-flex align-items-center gap-2">
                <FaFilter className="text-muted small" />
                <Form.Select
                  size="sm"
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                >
                  <option value="ALL">Tất cả giới tính</option>
                  <option value="Male">Nam (Male)</option>
                  <option value="Female">Nữ (Female)</option>
                  <option value="All">Chung cả 2 giới</option>
                </Form.Select>
              </div>
            </Col>

            <Col md={3}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang áp dụng (Active)</option>
                <option value="INACTIVE">Đã khóa (Inactive)</option>
              </Form.Select>
            </Col>

            <Col md={2} className="text-end">
              <span className="small text-muted fw-semibold">
                Tổng: <strong className="text-primary">{pagination.totalCount}</strong> dải
              </span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Reference Intervals Data Table */}
      <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0" style={{ fontSize: '13.5px' }}>
              <thead className="table-light text-secondary border-bottom">
                <tr>
                  <th className="py-3 px-3">Chỉ Số Xét Nghiệm</th>
                  <th className="py-3">Giới Tính</th>
                  <th className="py-3">Nhóm Tuổi & Bối Cảnh</th>
                  <th className="py-3 text-end">Khoảng Bình Thường (BR-LAB-02)</th>
                  <th className="py-3 text-end text-danger">Ngưỡng PANIC (BR-LAB-03)</th>
                  <th className="py-3">Chuẩn Tham Chiếu</th>
                  <th className="py-3 text-center">Trạng Thái</th>
                  {canConfigureIntervals && <th className="py-3 text-end px-3">Thao Tác</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <div className="mt-2 text-muted small">Đang tải khoảng tham chiếu sinh học...</div>
                    </td>
                  </tr>
                ) : intervals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <FaInfoCircle size={32} className="mb-2 text-secondary opacity-50 d-block mx-auto" />
                      Không tìm thấy khoảng tham chiếu phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  intervals.map((item) => (
                    <tr key={item.id} className={!item.isActive ? 'table-secondary opacity-75' : ''}>
                      <td className="px-3">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold font-monospace px-2 py-1">
                            {item.criterionCode}
                          </span>
                          <div>
                            <div className="fw-semibold text-dark">{item.criterionName}</div>
                            <small className="text-muted">Đơn vị: {item.unit || 'N/A'}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Badge
                          bg={
                            item.gender === 'Male'
                              ? 'info'
                              : item.gender === 'Female'
                              ? 'danger'
                              : 'secondary'
                          }
                          className="px-2 py-1"
                        >
                          {item.gender === 'Male'
                            ? 'Nam'
                            : item.gender === 'Female'
                            ? 'Nữ'
                            : 'Tất cả'}
                        </Badge>
                      </td>

                      <td>
                        <div className="fw-medium text-dark">{item.demographicLabel}</div>
                        <small className="text-muted">
                          {item.ageMin} - {item.ageMax} {item.ageUnit === 'Years' ? 'tuổi' : item.ageUnit}
                          {item.condition && item.condition !== 'General' ? ` · ${item.condition}` : ''}
                        </small>
                      </td>

                      {/* Right-aligned per AGENTS-DESIGN.md */}
                      <td className="text-end fw-bold text-success font-monospace">
                        {item.formattedNormalRange}
                      </td>

                      {/* Right-aligned panic critical value */}
                      <td className="text-end font-monospace">
                        {item.formattedPanicRange !== 'Không áp dụng' ? (
                          <span className="badge bg-danger bg-opacity-10 text-danger fw-bold border border-danger border-opacity-25 px-2 py-1">
                            {item.formattedPanicRange}
                          </span>
                        ) : (
                          <span className="text-muted small">N/A</span>
                        )}
                      </td>

                      <td>
                        <div className="small fw-semibold text-secondary">{item.standardAuthority}</div>
                        {item.notes && (
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: '180px' }} title={item.notes}>
                            {item.notes}
                          </small>
                        )}
                      </td>

                      <td className="text-center">
                        <Badge bg={item.isActive ? 'success' : 'secondary'} className="px-2 py-1">
                          {item.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>

                      {canConfigureIntervals && (
                        <td className="text-end px-3">
                          <div className="d-flex justify-content-end gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="p-1 px-2"
                              title="Chỉnh sửa khoảng tham chiếu"
                              onClick={() => handleOpenEditModal(item)}
                            >
                              <FaEdit />
                            </Button>

                            <Button
                              variant={item.isActive ? 'outline-danger' : 'outline-success'}
                              size="sm"
                              className="p-1 px-2"
                              title={item.isActive ? 'Khóa khoảng tham chiếu' : 'Kích hoạt lại'}
                              onClick={() => handleToggleActive(item)}
                            >
                              {item.isActive ? <FaLock /> : <FaUnlock />}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <Card.Footer className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Hiển thị trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages}
            </span>
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev
                disabled={pagination.currentPage === 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
              />
              {[...Array(pagination.totalPages).keys()].map((p) => (
                <Pagination.Item
                  key={p + 1}
                  active={p + 1 === pagination.currentPage}
                  onClick={() => handlePageChange(p + 1)}
                >
                  {p + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
              />
            </Pagination>
          </Card.Footer>
        )}
      </Card>

      {/* Modal Configure Reference Interval */}
      <ReferenceIntervalModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        interval={modalState.interval}
        initialCriterionCode={searchCode}
        onClose={() => setModalState({ isOpen: false, mode: 'create', interval: null })}
        onSave={handleSaveInterval}
      />
    </div>
  );
}

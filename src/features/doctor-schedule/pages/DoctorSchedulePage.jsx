/**
 * @file DoctorSchedulePage.jsx
 * @description Master Clinical Doctor Schedule page (UC16).
 * Enables doctors, receptionists, and medical managers to track consultation shifts, room allocations, and patient capacity.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Table, Badge, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import {
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaUserMd, FaSearch,
  FaClock, FaClinicMedical, FaCheckCircle, FaUserCheck, FaFilter
} from 'react-icons/fa';
import { fetchDoctorSchedule } from '../api/scheduleApi';

/**
 * Format Date to YYYY-MM-DD for input controls.
 */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format Date to Vietnamese display string (Thứ X, DD/MM/YYYY).
 */
function toDisplayDate(d) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${dayName}, ${day}/${m}/${d.getFullYear()}`;
}

/**
 * Clinical shifts configuration.
 */
const CLINICAL_SHIFTS = [
  { id: 'morning', label: 'Ca Sáng (07:30 - 11:30)', timeRange: '07:30 - 11:30', badge: 'bg-primary' },
  { id: 'afternoon', label: 'Ca Chiều (13:00 - 17:00)', timeRange: '13:00 - 17:00', badge: 'bg-info' },
  { id: 'evening', label: 'Ca Ngoài Giờ (17:30 - 20:30)', timeRange: '17:30 - 20:30', badge: 'bg-warning' }
];

export default function DoctorSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleList, setScheduleList] = useState([]);

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load schedule data directly from MongoDB
  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDoctorSchedule({
        date: toDateStr(selectedDate),
        search: debouncedSearch || undefined
      });
      if (result && (result.doctors || result.Doctors)) {
        const rawDocs = result.doctors || result.Doctors || [];
        const normalized = rawDocs.map((d, index) => ({
          doctorId: d.doctorId || `DOC-${index + 1}`,
          fullName: d.fullName || 'Bác Sĩ Khám Bệnh',
          specialty: d.specialty || 'Chuyên Khoa Lâm Sàng',
          room: d.roomName || d.roomId || d.room || 'Phòng Khám Lâm Sàng',
          shift: d.shift || (index % 2 === 0 ? 'morning' : 'afternoon'),
          maxPatients: d.maxPatients || 20,
          registeredPatients: d.registeredPatients || 0,
          status: d.status === 'Approved' ? 'Đã Duyệt' : (d.status || 'Đã Duyệt'),
          slots: d.slots || []
        }));
        setScheduleList(normalized);
      } else {
        setScheduleList([]);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải lịch trực từ máy chủ.');
      setScheduleList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, debouncedSearch]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Navigation handlers
  const prevDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const nextDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const today = () => setSelectedDate(new Date());

  // Filter schedule list
  const filteredSchedule = useMemo(() => {
    return scheduleList.filter(item => {
      const matchSearch = !debouncedSearch ||
        item.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.specialty.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.room.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchShift = selectedShift === 'all' || item.shift === selectedShift;
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;

      return matchSearch && matchShift && matchStatus;
    });
  }, [scheduleList, debouncedSearch, selectedShift, selectedStatus]);

  return (
    <div className="w-100 py-1">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaCalendarAlt className="text-primary" />
            <span>Lịch Trực Bác Sĩ & Điều Phối Phòng Khám</span>
          </h2>
          <p className="text-muted small mb-0">
            Theo dõi phân bổ ca trực lâm sàng, phòng khám phụ trách và chỉ tiêu tiếp nhận bệnh nhân theo ngày.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="d-flex align-items-center gap-2 bg-white p-2 rounded-3 shadow-sm border">
          <Button variant="outline-secondary" size="sm" onClick={prevDay} title="Ngày trước">
            <FaChevronLeft />
          </Button>
          <Button variant="outline-primary" size="sm" onClick={today}>
            Hôm Nay
          </Button>
          <div className="fw-bold text-dark px-2 small">
            {toDisplayDate(selectedDate)}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={nextDay} title="Ngày sau">
            <FaChevronRight />
          </Button>
          <Form.Control
            type="date"
            size="sm"
            style={{ width: 'auto' }}
            value={toDateStr(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
          />
        </div>
      </div>

      {/* Toolbar & Filters */}
      <Card className="shadow-sm border-0 rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {/* Search */}
            <Col xs={12} md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0 text-muted">
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo tên bác sĩ, chuyên khoa hoặc phòng khám..."
                  className="border-start-0 ps-0"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* Shift Filter */}
            <Col xs={6} md={3}>
              <Form.Select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
              >
                <option value="all">Tất Cả Ca Trực</option>
                <option value="morning">Ca Sáng (07:30 - 11:30)</option>
                <option value="afternoon">Ca Chiều (13:00 - 17:00)</option>
                <option value="evening">Ca Ngoài Giờ (17:30 - 20:30)</option>
              </Form.Select>
            </Col>

            {/* Status Filter */}
            <Col xs={6} md={2}>
              <Form.Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tất Cả Trạng Thái</option>
                <option value="Đã Duyệt">Đã Duyệt</option>
                <option value="Chờ Duyệt">Chờ Duyệt</option>
              </Form.Select>
            </Col>

            {/* Counter */}
            <Col xs={12} md={2} className="text-md-end text-muted small">
              Hiển thị: <strong className="text-primary">{filteredSchedule.length}</strong> ca trực
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Schedule Table View */}
      <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4" style={{ width: '220px' }}>Bác Sĩ Trực</th>
                <th>Chuyên Khoa</th>
                <th>Phòng Khám Phụ Trách</th>
                <th style={{ width: '180px' }}>Ca Làm Việc</th>
                <th className="text-center" style={{ width: '150px' }}>Bệnh Nhân / Giới Hạn</th>
                <th className="text-center" style={{ width: '130px' }}>Trạng Thái</th>
                <th className="text-end pe-4" style={{ width: '120px' }}>Điều Phối</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span className="text-muted">Đang tải lịch trực bác sĩ...</span>
                  </td>
                </tr>
              ) : filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <FaUserMd className="fs-2 d-block mx-auto mb-2 text-muted" />
                    Không tìm thấy ca trực nào của bác sĩ trong ngày đã chọn.
                  </td>
                </tr>
              ) : (
                filteredSchedule.map((item, idx) => {
                  const shiftInfo = CLINICAL_SHIFTS.find(s => s.id === item.shift) || CLINICAL_SHIFTS[0];
                  const percent = Math.round((item.registeredPatients / item.maxPatients) * 100);

                  return (
                    <tr key={`${item.doctorId}-${idx}`}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                            <FaUserMd />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{item.fullName}</div>
                            <div className="text-muted small">{item.doctorId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-secondary">{item.specialty}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 text-dark">
                          <FaClinicMedical className="text-primary small" />
                          <span>{item.room}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${shiftInfo.badge} px-2 py-1`}>
                          {shiftInfo.timeRange}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="fw-bold text-dark">
                          {item.registeredPatients} / {item.maxPatients}
                        </div>
                        <div className="progress mt-1" style={{ height: '5px' }}>
                          <div
                            className={`progress-bar ${percent >= 80 ? 'bg-danger' : 'bg-success'}`}
                            role="progressbar"
                            style={{ width: `${percent}%` }}
                            aria-valuenow={percent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill">
                          <FaCheckCircle className="me-1 small" />
                          {item.status}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3"
                          onClick={() => alert(`Điều phối bệnh nhân sang ca trực của ${item.fullName}`)}
                        >
                          Tiếp nhận
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
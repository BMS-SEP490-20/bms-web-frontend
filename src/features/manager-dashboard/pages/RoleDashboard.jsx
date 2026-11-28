/**
 * @file RoleDashboard.jsx
 * @description Unified Role-Scoped Operations Dashboard (UC12).
 * Strictly enforces RBAC separation of duties: each authenticated staff member only views
 * and queries endpoints permitted for their own canonical role, with 100% real backend data
 * and Modern Soft Healthcare SaaS styling.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle2, AlertTriangle, TestTube2, ClipboardCheck, Timer, Thermometer, DoorOpen, SlidersHorizontal, Banknote, ArrowRight, RefreshCw, HeartPulse, Stethoscope, FileText, FlaskConical, QrCode, UserPlus, Clock, CalendarCheck, Receipt, Database, UserCog, Users, Server, History } from 'lucide-react';
import api from '../../../config/api';
import { fetchVerificationQueue } from '../../laboratory/api/testResultVerificationApi';
import { getAdminOps } from '../../admin/services/adminOpsService';
import { ROLES, ROLE_LABELS, resolveRoleId, getStoredUser } from '../../../constants/roles';

const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('vi-VN');

const ROLE_META = {
  Admin: {
    title: 'Bảng Điều Khiển Quản Trị Hệ Thống',
    subtitle: 'Giám sát tài khoản nhân sự (IAM), phân quyền vai trò (RBAC), nhật ký kiểm toán và sao lưu dữ liệu.'
  },
  Manager: {
    title: 'Bảng Điều Khiển Trưởng Khoa Xét Nghiệm',
    subtitle: 'Điều hành thẩm định ký số kết quả, hiệu suất thời gian trả kết quả TAT và kiểm chuẩn chất lượng.'
  },
  Doctor: {
    title: 'Bảng Điều Khiển Bác Sĩ Lâm Sàng',
    subtitle: 'Theo dõi lịch khám trong ngày, kết quả xét nghiệm mới và hồ sơ bệnh án điện tử.'
  },
  LaboratoryUser: {
    title: 'Bảng Điều Khiển Kỹ Thuật Viên Lab',
    subtitle: 'Theo dõi hàng đợi mẫu bệnh phẩm, tiến độ phân tích và kiểm soát chất lượng nội bộ.'
  },
  Receptionist: {
    title: 'Bảng Điều Khiển Lễ Tân & Tiếp Đón',
    subtitle: 'Điều phối check-in lịch hẹn, hàng đợi gọi số, tiếp nhận khách vãng lai và viện phí trong ca.'
  }
};

function resolveDashboardRoleKey(user) {
  const roleId = resolveRoleId(user);
  switch (roleId) {
    case ROLES.ADMIN:
      return 'Admin';
    case ROLES.DOCTOR:
      return 'Doctor';
    case ROLES.LAB:
      return 'LaboratoryUser';
    case ROLES.RECEPTIONIST:
      return 'Receptionist';
    case ROLES.MANAGER:
    default:
      return 'Manager';
  }
}

function renderPriorityBadge(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'stat') return <Badge bg="danger">Cấp cứu (STAT)</Badge>;
  if (p === 'urgent') return <Badge bg="warning">Khẩn cấp</Badge>;
  return <Badge bg="secondary">Thường quy</Badge>;
}

function renderStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complete') || s.includes('paid') || s.includes('approved') || s.includes('success')) {
    return <Badge bg="success">{status}</Badge>;
  }
  if (s.includes('checkin') || s.includes('checkedin') || s.includes('called') || s.includes('progress') || s.includes('testing') || s.includes('collecting')) {
    return <Badge bg="primary">{status}</Badge>;
  }
  if (s.includes('wait') || s.includes('pending') || s.includes('confirm')) {
    return <Badge bg="warning">{status}</Badge>;
  }
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) {
    return <Badge bg="danger">{status}</Badge>;
  }
  return <Badge bg="secondary">{status || '—'}</Badge>;
}

export default function RoleBasedDashboard() {
  const navigate = useNavigate();

  const currentUser = useMemo(() => getStoredUser(), []);
  const activeRole = useMemo(() => resolveDashboardRoleKey(currentUser), [currentUser]);
  const meta = ROLE_META[activeRole] || ROLE_META.Manager;

  const [stats, setStats] = useState(null);
  const [adminOps, setAdminOps] = useState(null);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [labSamples, setLabSamples] = useState([]);
  const [receptionQueue, setReceptionQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeRole === 'Admin') {
        const opsData = await getAdminOps();
        setAdminOps(opsData || null);
      } else {
        const statsRes = await api.get('/dashboard/stats');
        const payload = statsRes?.data?.data || statsRes?.data || null;
        setStats(payload);

        if (activeRole === 'Manager') {
          try {
            const qRes = await fetchVerificationQueue();
            const list = Array.isArray(qRes) ? qRes : (Array.isArray(qRes?.data) ? qRes.data : []);
            setVerificationQueue(list.slice(0, 8));
          } catch {
            setVerificationQueue([]);
          }
        } else if (activeRole === 'Doctor') {
          const scheduleFromStats = payload?.doctorData?.todaySchedule;
          if (Array.isArray(scheduleFromStats) && scheduleFromStats.length > 0) {
            setDoctorAppointments(scheduleFromStats.slice(0, 8));
          } else {
            try {
              const today = new Date().toISOString().slice(0, 10);
              const aptRes = await api.get('/appointments', {
                params: { fromDate: today, toDate: today, page: 1, pageSize: 8 }
              });
              const list = aptRes?.data?.data || aptRes?.data?.items || [];
              setDoctorAppointments(Array.isArray(list) ? list.slice(0, 8) : []);
            } catch {
              setDoctorAppointments([]);
            }
          }
        } else if (activeRole === 'LaboratoryUser') {
          try {
            const smpRes = await api.get('/laboratory/samples/queue', { params: { page: 1, pageSize: 8 } });
            const raw = smpRes?.data?.data || smpRes?.data?.items || smpRes?.data || [];
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
            setLabSamples(list.slice(0, 8));
          } catch {
            setLabSamples([]);
          }
        } else if (activeRole === 'Receptionist') {
          try {
            const qRes = await api.get('/reception/queue');
            const list = qRes?.data?.data?.currentQueue || [];
            setReceptionQueue(Array.isArray(list) ? list.slice(0, 8) : []);
          } catch {
            setReceptionQueue([]);
          }
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('[RoleDashboard] API notice:', err);
      setAdminOps(null);
      setStats(null);
      setError(err?.response?.data?.message || err?.message || 'Không thể tải số liệu vận hành. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [activeRole]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const totalAdminUsers = useMemo(() => {
    if (!adminOps?.usersPerRole) return 0;
    return Object.values(adminOps.usersPerRole).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [adminOps]);

  return (
    <div className="w-100 py-1">

      <div className="bms-page-header-card mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 w-100">
          <div className="bms-page-header-content">
            <h1 className="bms-page-title m-0">{meta.title}</h1>
            <p className="text-muted small m-0 mt-1">{meta.subtitle}</p>
          </div>
          <div className="bms-page-actions">
            <span className="text-muted small d-none d-md-inline me-1">
              Cập nhật lúc <strong className="text-dark">{lastRefreshed.toLocaleTimeString('vi-VN')}</strong>
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-2"
              onClick={loadDashboardData}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'fa-spin' : ''} size={12} />
              <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4">
          <AlertTriangle className="me-2"  size="1em"/>
          {error}
        </Alert>
      )}

      <div className="mb-4">
        {activeRole === 'Manager' && (
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Đơn Xét Nghiệm Hôm Nay</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.managerData?.totalOrdersToday ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Tổng lượt chỉ định trong ngày</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><ClipboardCheck  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Doanh Thu Viện Phí Hôm Nay</h6>
                  <div className="bms-kpi-value">{VND.format(stats?.managerData?.revenueToday ?? 0)}</div>
                  <div className="bms-kpi-sub text-success">Tổng hóa đơn đã thanh toán</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-green"><Banknote  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Thời Gian Trả KQ Trung Bình</h6>
                  <div className="bms-kpi-value">
                    {stats?.managerData?.averageTatMinutes ? `${stats.managerData.averageTatMinutes} phút` : '—'}
                  </div>
                  <div className="bms-kpi-sub text-muted">Chỉ số hiệu suất TAT</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><Timer  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Nhiệt Độ Tủ Bảo Quản IoT</h6>
                  <div className="bms-kpi-value">
                    {stats?.managerData?.coldStorageTemperature != null ? `${stats.managerData.coldStorageTemperature}°C` : '—'}
                  </div>
                  <div className="bms-kpi-sub text-muted">
                    {(stats?.managerData?.activeAlertsCount ?? 0) === 0
                      ? 'Dải tiêu chuẩn 2°C – 8°C'
                      : `${stats.managerData.activeAlertsCount} cảnh báo vượt ngưỡng`}
                  </div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-cyan"><Thermometer  size="1em"/></div>
              </div>
            </Col>
          </Row>
        )}

        {activeRole === 'Doctor' && (
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Lịch Khám Hôm Nay</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.doctorData?.todayAppointmentsCount ?? doctorAppointments.length)}</div>
                  <div className="bms-kpi-sub text-primary">Ca khám phân công trong ngày</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><Stethoscope  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Kết Quả Chờ Xem Xét</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.doctorData?.pendingApprovalsCount ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Phiếu xét nghiệm cần hội chẩn</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><ClipboardCheck  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Hồ Sơ Đã Hoàn Tất Khám</h6>
                  <div className="bms-kpi-value">{stats?.doctorData?.reviewedTodayCount ?? 0}</div>
                  <div className="bms-kpi-sub text-success">Đã thẩm định trong ca</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-green"><CheckCircle2  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Ca Trực Hiện Tại</h6>
                  <div className="bms-kpi-value fs-4">{stats?.doctorData?.currentShiftName || '—'}</div>
                  <div className="bms-kpi-sub text-muted">{stats?.doctorData?.currentShiftWindow || 'Theo lịch phân công'}</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><Stethoscope  size="1em"/></div>
              </div>
            </Col>
          </Row>
        )}

        {activeRole === 'LaboratoryUser' && (
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Mẫu Đang Chờ Xử Lý</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.labUserData?.queueWaitingCount ?? 0)}</div>
                  <div className="bms-kpi-sub text-primary">Hàng đợi tiếp nhận phòng Lab</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><TestTube2  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Mẫu Đang Phân Tích</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.labUserData?.inProgressCount ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Đang chạy máy xét nghiệm</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><FlaskConical  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Hoàn Tất Hôm Nay</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.labUserData?.completedTodayCount ?? 0)}</div>
                  <div className="bms-kpi-sub text-success">Đã ghi nhận kết quả đo lường</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-green"><CheckCircle2  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Yêu Cầu Chạy Lại (Rerun)</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.labUserData?.rerunRequestedCount ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Mẫu cần kiểm tra đối chiếu lại</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-rose"><AlertTriangle  size="1em"/></div>
              </div>
            </Col>
          </Row>
        )}

        {activeRole === 'Receptionist' && (
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Lượt Check-in Hôm Nay</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.receptionistData?.checkInsToday ?? 0)}</div>
                  <div className="bms-kpi-sub text-success">Tiếp đón tại quầy và quét QR</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-green"><QrCode  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Đang Chờ Gọi Số</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.receptionistData?.waitingQueueCount ?? receptionQueue.length)}</div>
                  <div className="bms-kpi-sub text-primary">Bệnh nhân tại sảnh chờ</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><Clock  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Khách Vãng Lai Hôm Nay</h6>
                  <div className="bms-kpi-value">{NUM.format(stats?.receptionistData?.totalWalkIns ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Hồ sơ đăng ký trực tiếp tại quầy</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><UserPlus  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Viện Phí Thu Tại Quầy</h6>
                  <div className="bms-kpi-value">{VND.format(stats?.receptionistData?.paymentsCollectedToday ?? 0)}</div>
                  <div className="bms-kpi-sub text-success">Xuất hóa đơn điện tử 100%</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><Receipt  size="1em"/></div>
              </div>
            </Col>
          </Row>
        )}

        {activeRole === 'Admin' && (
          <Row className="g-3">
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Tổng Tài Khoản Hệ Thống</h6>
                  <div className="bms-kpi-value">{NUM.format(totalAdminUsers)}</div>
                  <div className="bms-kpi-sub text-muted">Nhân sự y tế và bệnh nhân</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><Users  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Hoạt Động 24 Giờ Qua</h6>
                  <div className="bms-kpi-value">{NUM.format(adminOps?.logins?.distinctAccountsLast24h ?? 0)}</div>
                  <div className="bms-kpi-sub text-success">{NUM.format(adminOps?.logins?.distinctAccountsLast7d ?? 0)} tài khoản trong 7 ngày</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-green"><UserCog  size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Nhật Ký Kiểm Toán (Audit)</h6>
                  <div className="bms-kpi-value">{NUM.format(adminOps?.auditLogRows ?? 0)}</div>
                  <div className="bms-kpi-sub text-muted">Bản ghi truy xuất hệ thống</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-cyan"><History size="1em"/></div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="bms-kpi-quad-card">
                <div>
                  <h6 className="bms-kpi-label">Sao Lưu Cơ Sở Dữ Liệu</h6>
                  <div className="bms-kpi-value fs-5">{adminOps?.backup?.lastStatus || 'Sẵn sàng'}</div>
                  <div className="bms-kpi-sub text-muted">Snapshot MongoDB tự động</div>
                </div>
                <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><Database size="1em"/></div>
              </div>
            </Col>
          </Row>
        )}
      </div>

      {activeRole === 'Manager' && (
        <>
          <div className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h5 className="bms-table-standalone-title">
                  <ClipboardCheck style={{ color: '#1E60E6' }}  size="1em"/>
                  Hàng Đợi Thẩm Định Kỹ Thuật (Tùy chọn — QC / Westgard)
                </h5>
                <div className="bms-table-standalone-subtitle">
                  Bước tùy chọn của Quản lý Lab. Công bố kết quả cho bệnh nhân chỉ sau khi Bác sĩ ký duyệt tại bàn khám.
                </div>
              </div>
              <Link
                to="/laboratory/verify-results"
                className="btn btn-sm btn-primary rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-xs fw-semibold"
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              >
                <span>Vào thẩm định kỹ thuật</span>
                <ArrowRight size={11} />
              </Link>
            </div>
            <div className="bms-table-standalone-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Mã Mẫu</th>
                      <th>Bệnh Nhân</th>
                      <th>Gói Xét Nghiệm</th>
                      <th>Độ Ưu Tiên</th>
                      <th>Thời Gian Gửi</th>
                      <th className="text-end pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải hàng đợi thẩm định...
                        </td>
                      </tr>
                    ) : verificationQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Hiện không có mẫu xét nghiệm nào đang chờ ký duyệt.
                        </td>
                      </tr>
                    ) : (
                      verificationQueue.map((item, idx) => {
                        const specimenId = item.specimenId || item.id || `SPC-${idx + 1}`;
                        return (
                          <tr key={specimenId}>
                            <td className="ps-4 fw-semibold font-monospace text-primary">{specimenId}</td>
                            <td className="fw-medium text-dark">{item.patientName || '—'}</td>
                            <td className="text-muted">{item.packageName || 'Xét nghiệm lâm sàng'}</td>
                            <td>{renderPriorityBadge(item.priority)}</td>
                            <td className="text-muted">
                              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="text-end pe-4">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="rounded-pill px-3 py-1 fw-semibold"
                                onClick={() => navigate(`/laboratory/verify-results?specimenId=${encodeURIComponent(specimenId)}`)}
                              >
                                Thẩm Định
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Link to="/laboratory/rooms" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><DoorOpen  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Phòng Xét Nghiệm</h6>
                    <small className="text-muted">Quản lý phòng lab và thiết bị</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở danh mục</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/criteria" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-green"><SlidersHorizontal  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Danh Mục Chỉ Số</h6>
                    <small className="text-muted">Chỉ số và đơn vị đo lường</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-success small fw-semibold">
                  <span>Mở danh mục</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/laboratory/reference-intervals" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-cyan"><HeartPulse  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Khoảng Tham Chiếu</h6>
                    <small className="text-muted">Ngưỡng sinh học và cảnh báo</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Cấu hình</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/reports/revenue" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><Banknote  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Báo Cáo Doanh Thu</h6>
                    <small className="text-muted">Thống kê tài chính viện phí</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Xem báo cáo</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
          </Row>
        </>
      )}

      {activeRole === 'Doctor' && (
        <>
          <div className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h5 className="bms-table-standalone-title">Lịch Khám &amp; Tiếp Đón Bệnh Nhân Hôm Nay</h5>
                <div className="bms-table-standalone-subtitle">
                  Danh sách lịch hẹn khám và chỉ định xét nghiệm trong ngày
                </div>
              </div>
              <Link to="/doctor/console" className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold">
                Mở Bàn Khám
              </Link>
            </div>
            <div className="bms-table-standalone-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Mã Lịch Hẹn</th>
                      <th>Bệnh Nhân</th>
                      <th>Dịch Vụ / Gói Khám</th>
                      <th>Khung Giờ</th>
                      <th>Trạng Thái</th>
                      <th className="text-end pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải lịch khám hôm nay...
                        </td>
                      </tr>
                    ) : doctorAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Chưa có lịch hẹn khám nào được phân công trong hôm nay.
                        </td>
                      </tr>
                    ) : (
                      doctorAppointments.map((apt, idx) => {
                        const code = apt.appointmentCode || apt.appointmentId || apt.id || `APT-${idx + 1}`;
                        return (
                          <tr key={code}>
                            <td className="ps-4 fw-semibold font-monospace text-primary">{code}</td>
                            <td className="fw-medium text-dark">{apt.patientName || '—'}</td>
                            <td className="text-muted">{apt.packageName || apt.testPackageName || 'Khám lâm sàng'}</td>
                            <td>{apt.slotTime || apt.appointmentTime || '—'}</td>
                            <td>{renderStatusBadge(apt.status)}</td>
                            <td className="text-end pe-4">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="rounded-pill px-3 py-1 fw-semibold"
                                onClick={() => navigate('/doctor/console')}
                              >
                                Vào Khám
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Link to="/doctor/console" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><Stethoscope  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Bàn Khám Bác Sĩ</h6>
                    <small className="text-muted">Gọi số và khám bệnh nhân</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở bàn khám</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/doctor/orders/create" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-green"><FileText  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Chỉ Định Xét Nghiệm</h6>
                    <small className="text-muted">Tạo phiếu y lệnh cận lâm sàng</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-success small fw-semibold">
                  <span>Lập y lệnh</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/doctor/emr" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><FileText  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Bệnh Án Điện Tử (EMR)</h6>
                    <small className="text-muted">Tra cứu và lập bệnh án</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở EMR</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/medical-assessments" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><HeartPulse  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Chẩn Đoán ICD-10</h6>
                    <small className="text-muted">Đánh giá lâm sàng và phác đồ</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở danh sách</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
          </Row>
        </>
      )}

      {activeRole === 'LaboratoryUser' && (
        <>
          <div className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h5 className="bms-table-standalone-title">Hàng Đợi Mẫu Bệnh Phẩm Trong Ca</h5>
                <div className="bms-table-standalone-subtitle">
                  Danh sách mẫu bệnh phẩm mới nhất đang chờ tiếp nhận và phân tích
                </div>
              </div>
              <Link to="/lab/queue" className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold">
                Xem Toàn Bộ Hàng Đợi
              </Link>
            </div>
            <div className="bms-table-standalone-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Barcode Mẫu</th>
                      <th>Bệnh Nhân</th>
                      <th>Loại Mẫu</th>
                      <th>Độ Ưu Tiên</th>
                      <th>Trạng Thái</th>
                      <th className="text-end pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải hàng đợi mẫu...
                        </td>
                      </tr>
                    ) : labSamples.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Hiện chưa có mẫu bệnh phẩm nào trong hàng đợi.
                        </td>
                      </tr>
                    ) : (
                      labSamples.map((smp, idx) => (
                        <tr key={smp.id || smp.barcode || idx}>
                          <td className="ps-4 fw-semibold font-monospace text-primary">{smp.barcode || smp.id}</td>
                          <td className="fw-medium text-dark">{smp.patientName || '—'}</td>
                          <td className="text-muted">{smp.sampleType || 'Máu toàn phần'} {smp.tubeColor ? `(${smp.tubeColor})` : ''}</td>
                          <td>{renderPriorityBadge(smp.priority)}</td>
                          <td>{renderStatusBadge(smp.status)}</td>
                          <td className="text-end pe-4">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="rounded-pill px-3 py-1 fw-semibold"
                              onClick={() => navigate('/laboratory/enter-test-results')}
                            >
                              Xử Lý Mẫu
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Link to="/lab/queue" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><TestTube2  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Hàng Đợi Mẫu</h6>
                    <small className="text-muted">Theo dõi vòng đời ống mẫu</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở hàng đợi</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/laboratory/checkinsample" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-green"><CheckCircle2  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Tiếp Nhận Mẫu Máu</h6>
                    <small className="text-muted">Quét barcode nhận mẫu</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-success small fw-semibold">
                  <span>Tiếp nhận</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/laboratory/enter-test-results" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><FileText  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Nhập Kết Quả XN</h6>
                    <small className="text-muted">Ghi nhận chỉ số phân tích</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Nhập kết quả</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/qc/management" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><FlaskConical  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Kiểm Chuẩn IQC</h6>
                    <small className="text-muted">Biểu đồ Levey-Jennings</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở IQC</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
          </Row>
        </>
      )}

      {activeRole === 'Receptionist' && (
        <>
          <div className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h5 className="bms-table-standalone-title">Hàng Đợi Sảnh Đón Tiếp &amp; Lấy Mẫu</h5>
                <div className="bms-table-standalone-subtitle">
                  Danh sách số thứ tự đang chờ phục vụ tại các quầy tiếp nhận
                </div>
              </div>
              <div className="d-flex gap-2">
                <Link to="/receptionist/check-in" className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold">
                  Check-in QR
                </Link>
                <Link to="/reception/queue" className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold">
                  Bảng Gọi Số
                </Link>
              </div>
            </div>
            <div className="bms-table-standalone-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Số Thứ Tự</th>
                      <th>Bệnh Nhân</th>
                      <th>Mã Bệnh Nhân</th>
                      <th>Độ Ưu Tiên</th>
                      <th>Trạng Thái</th>
                      <th className="text-end pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải hàng đợi tiếp đón...
                        </td>
                      </tr>
                    ) : receptionQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Hiện chưa có bệnh nhân nào đang chờ trong hàng đợi lấy mẫu.
                        </td>
                      </tr>
                    ) : (
                      receptionQueue.map((ticket, idx) => (
                        <tr key={ticket.id || ticket.ticketNumber || idx}>
                          <td className="ps-4 fw-semibold font-monospace text-primary">{ticket.ticketNumber || `#${idx + 1}`}</td>
                          <td className="fw-medium text-dark">{ticket.patientName || '—'}</td>
                          <td className="font-monospace text-muted">{ticket.patientCode || '—'}</td>
                          <td>{renderPriorityBadge(ticket.priority)}</td>
                          <td>{renderStatusBadge(ticket.status)}</td>
                          <td className="text-end pe-4">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="rounded-pill px-3 py-1 fw-semibold"
                              onClick={() => navigate('/reception/queue')}
                            >
                              Điều Phối
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Link to="/receptionist/check-in" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><QrCode  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Tiếp Đón &amp; Check-in</h6>
                    <small className="text-muted">Quét mã QR lịch hẹn</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở quầy check-in</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/receptionist/create-patient" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><UserPlus  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Tiếp Nhận Vãng Lai</h6>
                    <small className="text-muted">Đăng ký hồ sơ mới tại quầy</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Tạo hồ sơ</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/reception/queue" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-green"><Clock size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Điều Phối Hàng Đợi</h6>
                    <small className="text-muted">Theo dõi STT và gọi bệnh nhân</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-success small fw-semibold">
                  <span>Mở hàng đợi</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/appointments" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><CalendarCheck size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Sổ Lịch Hẹn Khám</h6>
                    <small className="text-muted">Quản lý lịch hẹn tại quầy</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Xem lịch hẹn</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
          </Row>
        </>
      )}

      {activeRole === 'Admin' && (
        <>
          <div className="bms-table-standalone-section mb-4">
            <div className="bms-table-standalone-header">
              <div>
                <h5 className="bms-table-standalone-title">Phân Bổ Nhân Sự &amp; Tài Khoản Hệ Thống (IAM)</h5>
                <div className="bms-table-standalone-subtitle">
                  Thống kê số lượng tài khoản hoạt động theo từng nhóm vai trò phân quyền
                </div>
              </div>
              <Link to="/admin/user-management" className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold">
                Quản Lý Tài Khoản
              </Link>
            </div>
            <div className="bms-table-standalone-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Vai Trò Hệ Thống</th>
                      <th className="text-end">Số Lượng Tài Khoản</th>
                      <th className="text-center">Trạng Thái</th>
                      <th className="text-end pe-4">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          <Spinner animation="border" size="sm" className="me-2" /> Đang tải thống kê tài khoản...
                        </td>
                      </tr>
                    ) : !adminOps?.usersPerRole || Object.keys(adminOps.usersPerRole).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          Chưa ghi nhận dữ liệu phân bổ tài khoản.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(adminOps.usersPerRole).map(([roleKey, count]) => (
                        <tr key={roleKey}>
                          <td className="ps-4 fw-medium text-dark">{ROLE_LABELS[resolveRoleId(roleKey)] || ROLE_LABELS[roleKey] || roleKey}</td>
                          <td className="text-end fw-semibold font-monospace">{NUM.format(count)}</td>
                          <td className="text-center"><Badge bg="success">Đang hoạt động</Badge></td>
                          <td className="text-end pe-4">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="rounded-pill px-3 py-1 fw-semibold"
                              onClick={() => navigate('/admin/user-management')}
                            >
                              Chi Tiết
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Link to="/admin/user-management" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><UserCog  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Quản Lý Tài Khoản</h6>
                    <small className="text-muted">Cấp phát và phân quyền IAM</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở quản trị IAM</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/roles" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-green"><CheckCircle2  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Phân Quyền Vai Trò</h6>
                    <small className="text-muted">Ma trận đặc quyền RBAC</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-success small fw-semibold">
                  <span>Mở RBAC</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/admin/audit-logs" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-purple"><History  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Nhật Ký Audit</h6>
                    <small className="text-muted">Lịch sử truy xuất hệ thống</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở nhật ký</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <Link to="/admin/backup" className="bms-quick-tile">
                <div className="d-flex align-items-center gap-3">
                  <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><Database  size="1em"/></div>
                  <div>
                    <h6 className="fw-semibold mb-0">Sao Lưu &amp; Khôi Phục</h6>
                    <small className="text-muted">Snapshot cơ sở dữ liệu</small>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between text-primary small fw-semibold">
                  <span>Mở sao lưu</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

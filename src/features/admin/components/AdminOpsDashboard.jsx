/**
 * @file AdminOpsDashboard.jsx
 * @description Admin dashboard (UC12) — operations data only (decision 10, DOT2 follow-up 6): users per role,
 * locked accounts, login activity, backup status, audit-log rows, IoT devices, total revenue.
 * Never shows patients, results, panic values or samples.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Col, Row, Spinner, Table } from 'react-bootstrap';
import { FaExclamationTriangle, FaUsers, FaLock, FaUserCheck, FaCoins } from 'react-icons/fa';
import { ROLES, ROLE_LABELS } from '../../../constants/roles';
import { getAdminOps } from '../services/adminOpsService';

const ROLE_NAME_TO_ID = { Admin: ROLES.ADMIN, Manager: ROLES.MANAGER, Lab: ROLES.LAB, Doctor: ROLES.DOCTOR, Receptionist: ROLES.RECEPTIONIST, Patient: ROLES.PATIENT };
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('vi-VN');
const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * One metric tile.
 * @param {{ label: string, value: React.ReactNode, hint?: string, icon?: React.ReactNode, iconTone?: string }} props
 * @returns {JSX.Element}
 */
function Metric({ label, value, hint, icon, iconTone = 'bms-kpi-icon-blue' }) {
  return (
    <div className="bms-kpi-quad-card">
      <div>
        <h6 className="bms-kpi-label">{label}</h6>
        <div className="bms-kpi-value">{value}</div>
        {hint && <div className="bms-kpi-sub text-muted">{hint}</div>}
      </div>
      {icon && <div className={`bms-kpi-icon-badge ${iconTone}`}>{icon}</div>}
    </div>
  );
}

/**
 * Admin operations dashboard.
 * @returns {JSX.Element}
 */
export default function AdminOpsDashboard() {
  const [ops, setOps] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getAdminOps(controller.signal)
      .then(setOps)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.response?.data?.message || 'Không tải được số liệu vận hành.');
      });
    return () => controller.abort();
  }, []);

  if (error) return <Alert variant="danger" role="alert">{error}</Alert>;
  if (!ops) {
    return (
      <div className="text-center py-3" role="status" aria-live="polite">
        <Spinner animation="border" variant="primary" aria-hidden="true" />
        <p className="text-muted mt-2">Đang tải số liệu vận hành…</p>
      </div>
    );
  }

  const totalUsers = Object.values(ops.usersPerRole || {}).reduce((a, b) => a + b, 0);
  const devicesTotal = ops.iotDevices.online + ops.iotDevices.offline;
  const backupFailed = ops.backup.lastStatus === 'Failed' || ops.backup.lastStatus === 'Corrupted';

  return (
    <section className="bms-scope" aria-labelledby="admin-ops-title">
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 id="admin-ops-title" className="bms-page-title">Bảng Điều Khiển Vận Hành Hệ Thống</h1>
          </div>
          <p className="text-muted small m-0 mt-1">Chỉ số vận hành cho quản trị viên hệ thống, không hiển thị dữ liệu bệnh nhân hay kết quả xét nghiệm</p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}><Metric label="Tổng tài khoản" value={NUM.format(totalUsers)} icon={<FaUsers />} iconTone="bms-kpi-icon-blue" /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Tài khoản bị khóa" value={NUM.format(ops.lockedAccounts)} hint="Khóa hoặc đang tạm khóa do sai mật khẩu" icon={<FaLock />} iconTone="bms-kpi-icon-rose" /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Đăng nhập 24 giờ / 7 ngày" value={`${NUM.format(ops.logins.distinctAccountsLast24h)} / ${NUM.format(ops.logins.distinctAccountsLast7d)}`} hint={`${NUM.format(ops.logins.accountsWithFailedAttempts)} tài khoản có lần sai mật khẩu`} icon={<FaUserCheck />} iconTone="bms-kpi-icon-green" /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Tổng doanh thu đã thu" value={VND.format(ops.revenue.totalCollected)} hint={`${NUM.format(ops.revenue.paidInvoiceCount)} hóa đơn đã thanh toán`} icon={<FaCoins />} iconTone="bms-kpi-icon-amber" /></Col>
      </Row>

      <Row className="g-3">
        <Col lg={5}>
          <div className="bms-table-standalone-section m-0 h-100">
            <div className="bms-table-standalone-header">
              <h2 className="bms-table-standalone-title">Tài khoản theo vai trò</h2>
            </div>
            <div className="bms-table-standalone-body">
              <Table size="sm" className="mb-0 align-middle">
                <thead><tr><th scope="col">Vai trò</th><th scope="col" className="text-end">Số tài khoản</th></tr></thead>
                <tbody>
                  {Object.entries(ops.usersPerRole).map(([name, count]) => (
                    <tr key={name}><td>{ROLE_LABELS[ROLE_NAME_TO_ID[name]] || name}</td><td className="text-end bms-num fw-semibold">{NUM.format(count)}</td></tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </Col>
        <Col lg={7}>
          <div className="bms-table-standalone-section m-0 h-100">
            <div className="bms-table-standalone-header">
              <h2 className="bms-table-standalone-title">Hệ thống</h2>
            </div>
            <div className="bms-table-standalone-body">
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <th scope="row">Sao lưu gần nhất</th>
                    <td>
                      <span className={backupFailed ? 'text-danger fw-semibold d-inline-flex align-items-center gap-1' : ''}>
                        {backupFailed && <FaExclamationTriangle aria-hidden="true" />}{ops.backup.lastStatus || 'Chưa có bản sao lưu'}
                      </span>
                      {ops.backup.lastCreatedAtUtc && <span className="text-muted"> · {DATE.format(new Date(ops.backup.lastCreatedAtUtc))}</span>}
                    </td>
                  </tr>
                  <tr><th scope="row">Sao lưu 7 ngày (thành công / lỗi)</th><td className="bms-num">{ops.backup.completedLast7d} / {ops.backup.failedLast7d}</td></tr>
                  <tr><th scope="row">Số dòng nhật ký kiểm toán</th><td className="bms-num">{NUM.format(ops.auditLogRows)}</td></tr>
                  <tr><th scope="row">Thiết bị IoT hoạt động / tổng</th><td className="bms-num">{ops.iotDevices.online} / {devicesTotal}<span className="text-muted"> (theo trạng thái cấu hình)</span></td></tr>
                </tbody>
              </Table>
            </div>
          </div>
        </Col>
      </Row>
      <p className="text-muted small mt-3">Cập nhật: {DATE.format(new Date(ops.generatedAtUtc))} (giờ Việt Nam)</p>
    </section>
  );
}

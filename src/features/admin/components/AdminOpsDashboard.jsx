/**
 * @file AdminOpsDashboard.jsx
 * @description Admin dashboard (UC12) — operations data only (decision 10, DOT2 follow-up 6): users per role,
 * locked accounts, login activity, backup status, audit-log rows, IoT devices, total revenue.
 * Never shows patients, results, panic values or samples.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { ROLES, ROLE_LABELS } from '../../../constants/roles';
import { getAdminOps } from '../services/adminOpsService';

const ROLE_NAME_TO_ID = { Admin: ROLES.ADMIN, Manager: ROLES.MANAGER, Lab: ROLES.LAB, Doctor: ROLES.DOCTOR, Receptionist: ROLES.RECEPTIONIST, Patient: ROLES.PATIENT };
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('vi-VN');
const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * One metric tile.
 * @param {{ label: string, value: React.ReactNode, hint?: string }} props
 * @returns {JSX.Element}
 */
function Metric({ label, value, hint }) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <div className="text-muted small">{label}</div>
        <div className="fs-4 fw-semibold bms-num">{value}</div>
        {hint && <div className="text-muted small">{hint}</div>}
      </Card.Body>
    </Card>
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
      <div className="text-center py-5" role="status" aria-live="polite">
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
      <h1 id="admin-ops-title" className="h3 mb-1">Bảng điều khiển vận hành hệ thống</h1>
      <p className="text-muted mb-4">Chỉ số vận hành cho Admin. Không hiển thị dữ liệu bệnh nhân hay kết quả xét nghiệm.</p>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}><Metric label="Tổng tài khoản" value={NUM.format(totalUsers)} /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Tài khoản bị khóa" value={NUM.format(ops.lockedAccounts)} hint="Khóa hoặc đang tạm khóa do sai mật khẩu" /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Đăng nhập 24 giờ / 7 ngày" value={`${NUM.format(ops.logins.distinctAccountsLast24h)} / ${NUM.format(ops.logins.distinctAccountsLast7d)}`} hint={`${NUM.format(ops.logins.accountsWithFailedAttempts)} tài khoản có lần sai mật khẩu`} /></Col>
        <Col xs={12} sm={6} lg={3}><Metric label="Tổng doanh thu đã thu" value={VND.format(ops.revenue.totalCollected)} hint={`${NUM.format(ops.revenue.paidInvoiceCount)} hóa đơn đã thanh toán`} /></Col>
      </Row>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h2 className="h5">Tài khoản theo vai trò</h2>
              <Table size="sm" className="mb-0">
                <thead><tr><th scope="col">Vai trò</th><th scope="col" className="text-end">Số tài khoản</th></tr></thead>
                <tbody>
                  {Object.entries(ops.usersPerRole).map(([name, count]) => (
                    <tr key={name}><td>{ROLE_LABELS[ROLE_NAME_TO_ID[name]] || name}</td><td className="text-end bms-num">{NUM.format(count)}</td></tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h2 className="h5">Hệ thống</h2>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <th scope="row">Sao lưu gần nhất</th>
                    <td>
                      <span className={backupFailed ? 'text-danger fw-semibold' : ''}>
                        {backupFailed && <span aria-hidden="true">⚠ </span>}{ops.backup.lastStatus || 'Chưa có bản sao lưu'}
                      </span>
                      {ops.backup.lastCreatedAtUtc && <span className="text-muted"> · {DATE.format(new Date(ops.backup.lastCreatedAtUtc))}</span>}
                    </td>
                  </tr>
                  <tr><th scope="row">Sao lưu 7 ngày (thành công / lỗi)</th><td className="bms-num">{ops.backup.completedLast7d} / {ops.backup.failedLast7d}</td></tr>
                  <tr><th scope="row">Số dòng nhật ký kiểm toán</th><td className="bms-num">{NUM.format(ops.auditLogRows)}</td></tr>
                  <tr><th scope="row">Thiết bị IoT hoạt động / tổng</th><td className="bms-num">{ops.iotDevices.online} / {devicesTotal}<span className="text-muted"> (theo trạng thái cấu hình)</span></td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <p className="text-muted small mt-3">Cập nhật: {DATE.format(new Date(ops.generatedAtUtc))} (giờ Việt Nam)</p>
    </section>
  );
}

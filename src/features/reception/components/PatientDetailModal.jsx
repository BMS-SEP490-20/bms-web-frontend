/**
 * @file PatientDetailModal.jsx
 * @description Redesigned patient clinical profile modal (UC30) for Admin / Manager / Reception / Doctor.
 */

import React from 'react';
import { Modal, Button, Spinner, Alert, Nav, Badge } from 'react-bootstrap';
import { IdCard, Phone, Mail, Droplet, AlertTriangle, HeartPulse, CalendarCheck, FileText, MapPin, Users } from 'lucide-react';

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
  if (n === 'male' || n === 'nam') return 'Nam';
  if (n === 'female' || n === 'nữ' || n === 'nu') return 'Nữ';
  return 'Khác';
}

function Field({ label, value, mono = false }) {
  return (
    <div className="bms-pd-field">
      <div className="bms-pd-field-label">{label}</div>
      <div className={`bms-pd-field-value ${mono ? 'font-monospace' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function VitalTile({ label, value }) {
  return (
    <div className="bms-pd-vital">
      <div className="bms-pd-vital-label">{label}</div>
      <div className="bms-pd-vital-value">{value}</div>
    </div>
  );
}

export default function PatientDetailModal({
  show,
  onHide,
  patient,
  loading = false,
  error = '',
  activeTab = 'summary',
  onTabChange
}) {
  const initial = patient?.fullName
    ? patient.fullName.trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() || 'P'
    : 'P';

  const code = patient?.patientCode || patient?.id || '—';
  const allergies = Array.isArray(patient?.allergies) ? patient.allergies : [];

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="xl"
      dialogClassName="bms-patient-detail-modal"
      contentClassName="border-0"
    >
      <Modal.Header closeButton className="bms-pd-header border-0">
        <Modal.Title className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
          <span className="bms-pd-title-icon"><IdCard  size="1em"/></span>
          Hồ sơ chi tiết bệnh nhân
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bms-pd-body">
        {error && (
          <Alert variant="danger" className="border-0 rounded-3 mb-3">
            <AlertTriangle className="me-2"  size="1em"/>
            {error}
          </Alert>
        )}

        {loading && !patient ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: '#1E60E6' }} />
            <div className="mt-3 text-muted small">Đang tải hồ sơ y tế...</div>
          </div>
        ) : patient ? (
          <>
            <section className="bms-pd-identity">
              <div className="bms-pd-avatar" aria-hidden="true">{initial}</div>
              <div className="bms-pd-identity-main">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <h2 className="bms-pd-name mb-0">{patient.fullName}</h2>
                  {patient.isGuest ? (
                    <span className="bms-pd-chip bms-pd-chip-guest">Khách vãng lai</span>
                  ) : (
                    <span className="bms-pd-chip bms-pd-chip-official">Bệnh nhân chính thức</span>
                  )}
                </div>
                <div className="bms-pd-meta">
                  <span className="font-monospace fw-semibold">{code}</span>
                  <span>·</span>
                  <span>{formatGenderLabel(patient.gender)}</span>
                  <span>·</span>
                  <span>{formatDate(patient.dateOfBirth)} ({patient.age ?? '—'} tuổi)</span>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <span className="bms-pd-chip bms-pd-chip-muted">
                    <Droplet className="me-1"  size="1em"/> Nhóm máu: {patient.bloodType || 'Chưa rõ'}
                  </span>
                  {allergies.length > 0 ? (
                    <span className="bms-pd-chip bms-pd-chip-warn">
                      <AlertTriangle className="me-1"  size="1em"/>
                      Dị ứng: {allergies.join(', ')}
                    </span>
                  ) : (
                    <span className="bms-pd-chip bms-pd-chip-muted">Không ghi nhận dị ứng</span>
                  )}
                </div>
              </div>
              <div className="bms-pd-identity-side">
                <div className="bms-pd-contact-row"><Phone  size="1em"/> {patient.phoneNumber || '—'}</div>
                <div className="bms-pd-contact-row"><Mail  size="1em"/> {patient.email || '—'}</div>
                <div className="bms-pd-contact-row"><IdCard  size="1em"/> CCCD: <span className="font-monospace">{patient.identityNumber || '—'}</span></div>
                <div className="bms-pd-contact-row text-muted">Lập hồ sơ: {formatDate(patient.createdAt)}</div>
              </div>
            </section>

            <Nav variant="pills" className="bms-pd-tabs mb-3">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'summary'}
                  onClick={() => onTabChange?.('summary')}
                >
                  <HeartPulse className="me-1"  size="1em"/> Hành chính & sinh hiệu
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'appointments'}
                  onClick={() => onTabChange?.('appointments')}
                >
                  <CalendarCheck className="me-1"  size="1em"/> Lịch hẹn ({patient.recentAppointments?.length || 0})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'records'}
                  onClick={() => onTabChange?.('records')}
                >
                  <FileText className="me-1"  size="1em"/> Bệnh án ({patient.recentMedicalRecords?.length || 0})
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {activeTab === 'summary' && (
              <div className="bms-pd-grid">
                <section className="bms-pd-panel">
                  <h3 className="bms-pd-panel-title">Thông tin hành chính</h3>
                  <div className="bms-pd-fields">
                    <Field label="Họ và tên" value={patient.fullName} />
                    <Field label="Mã bệnh nhân" value={code} mono />
                    <Field label="Ngày sinh / Tuổi" value={`${formatDate(patient.dateOfBirth)} (${patient.age ?? '—'} tuổi)`} />
                    <Field label="Giới tính" value={formatGenderLabel(patient.gender)} />
                    <Field label="Số CCCD" value={patient.identityNumber || 'Chưa cập nhật'} mono />
                    <Field label="Số điện thoại" value={patient.phoneNumber} mono />
                    <Field
                      label="Địa chỉ"
                      value={
                        <span className="d-inline-flex align-items-start gap-1">
                          <MapPin className="mt-1 text-muted flex-shrink-0"  size="1em"/>
                          {patient.address || 'Chưa cập nhật'}
                        </span>
                      }
                    />
                    <Field
                      label="Liên hệ khẩn cấp"
                      value={
                        <span className="d-inline-flex align-items-center gap-1">
                          <Users className="text-muted"  size="1em"/>
                          {patient.emergencyContactName || '—'}
                          {patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ''}
                        </span>
                      }
                    />
                  </div>
                </section>

                <section className="bms-pd-panel">
                  <h3 className="bms-pd-panel-title">Sinh hiệu & tiền sử</h3>
                  <div className="bms-pd-vitals">
                    <VitalTile
                      label="Chiều cao / Cân nặng"
                      value={`${patient.vitals?.heightCm || '—'} cm / ${patient.vitals?.weightKg || '—'} kg`}
                    />
                    <VitalTile
                      label="Huyết áp / Nhịp tim"
                      value={`${patient.vitals?.bloodPressure || '—'} · ${patient.vitals?.heartRateBpm || '—'} bpm`}
                    />
                    <VitalTile
                      label="Nhiệt độ / SpO₂"
                      value={`${patient.vitals?.temperatureC || '—'} °C · ${patient.vitals?.spo2Percent || '—'}%`}
                    />
                  </div>
                  <div className="bms-pd-note mt-3">
                    <div className="bms-pd-note-label">Tiền sử dị ứng</div>
                    <div className="bms-pd-note-body">
                      {allergies.length > 0 ? allergies.join(', ') : 'Không ghi nhận tiền sử dị ứng.'}
                    </div>
                  </div>
                  <div className="bms-pd-note mt-2">
                    <div className="bms-pd-note-label">Bệnh sử & ghi chú y khoa</div>
                    <div className="bms-pd-note-body">
                      {patient.medicalHistory || 'Không có tiền sử bệnh lý đặc biệt.'}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="bms-pd-table-wrap">
                {!patient.recentAppointments?.length ? (
                  <div className="bms-pd-empty">Chưa có lịch sử đặt lịch xét nghiệm.</div>
                ) : (
                  <table className="bms-pd-table">
                    <thead>
                      <tr>
                        <th>Mã lịch hẹn</th>
                        <th>Ngày</th>
                        <th>Khung giờ</th>
                        <th>Gói / dịch vụ</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th className="text-end">Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.recentAppointments.map((apt, idx) => (
                        <tr key={apt.appointmentId || apt.id || idx}>
                          <td className="font-monospace fw-semibold text-primary">{apt.appointmentId || apt.id}</td>
                          <td>{formatDate(apt.appointmentDate)}</td>
                          <td>{apt.timeSlot || apt.type || '—'}</td>
                          <td>
                            {apt.servicePackageName
                              || (Array.isArray(apt.testPackages) && apt.testPackages.length
                                ? apt.testPackages.join(', ')
                                : 'Xét nghiệm lâm sàng')}
                          </td>
                          <td><Badge bg="light" text="dark" className="border">{apt.status}</Badge></td>
                          <td>
                            <Badge bg={apt.paymentStatus === 'Paid' ? 'success' : 'secondary'}>
                              {apt.paymentStatus || 'Unpaid'}
                            </Badge>
                          </td>
                          <td className="text-end font-monospace">
                            {apt.totalAmount != null ? `${Number(apt.totalAmount).toLocaleString('vi-VN')} ₫` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'records' && (
              <div className="bms-pd-table-wrap">
                {!patient.recentMedicalRecords?.length ? (
                  <div className="bms-pd-empty">Chưa có bệnh án hoặc ghi chú lâm sàng.</div>
                ) : (
                  <table className="bms-pd-table">
                    <thead>
                      <tr>
                        <th>Mã bệnh án</th>
                        <th>Ngày khám</th>
                        <th>Bác sĩ</th>
                        <th>Chẩn đoán</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.recentMedicalRecords.map((rec, idx) => (
                        <tr key={rec.recordId || rec.id || idx}>
                          <td className="font-monospace fw-semibold">{rec.recordId || rec.id}</td>
                          <td>{formatDateTime(rec.visitDate || rec.createdAt)}</td>
                          <td>{rec.doctorName || rec.doctorId || 'Bác sĩ chuyên khoa'}</td>
                          <td className="fw-semibold">{rec.diagnosis || rec.symptoms || '—'}</td>
                          <td className="small text-secondary">
                            <div>{rec.clinicalNotes || rec.doctorNotes || '—'}</div>
                            {rec.recommendations && (
                              <div className="text-primary mt-1"><strong>Khuyến nghị:</strong> {rec.recommendations}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        ) : null}
      </Modal.Body>

      <Modal.Footer className="bms-pd-footer border-0">
        <Button variant="outline-secondary" className="rounded-pill px-4" onClick={onHide}>
          Đóng
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

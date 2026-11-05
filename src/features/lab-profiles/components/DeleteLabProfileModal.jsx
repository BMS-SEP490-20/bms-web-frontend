/** @file DeleteLabProfileModal.jsx
 * @description Explicit logical-deletion confirmation with mandatory reason and version conflict recovery.
 */
import React, { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { deleteLabProfile, labProfileError } from '../api/labProfileApi';

/** Archives professional details while preserving account identity and recorded history. */
export default function DeleteLabProfileModal({ profile, onClose, onDeleted, onReload }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    if (reason.trim().length < 5) { setError('Lý do xóa phải có ít nhất 5 ký tự.'); return; }
    setSaving(true); setError('');
    try { await deleteLabProfile(profile.id, { expectedRevision: profile.revision, reason: reason.trim() }); onDeleted('Đã xóa và lưu trữ hồ sơ Lab.'); }
    catch (err) { setError(labProfileError(err)); setConflict([404, 409].includes(err.response?.status)); }
    finally { setSaving(false); }
  };
  return <Modal show centered backdrop="static" keyboard={!saving} onHide={() => { if (!saving) onClose(); }}>
    <Modal.Header closeButton={!saving} style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}><Modal.Title className="h5 fw-bold text-danger">Xác nhận xóa hồ sơ Lab</Modal.Title></Modal.Header>
    <Modal.Body as={Form} id="delete-lab-profile-form" onSubmit={submit} className="p-4">
      {error && <Alert variant="danger" role="alert" style={{ borderRadius: 14 }}>{error}</Alert>}
      <p style={{ color: '#0f2743', fontSize: 16 }}>Xóa hồ sơ chuyên môn của <strong>{profile.fullName}</strong>?</p>
      <p className="small font-monospace text-break" style={{ color: '#648CF4', background: 'rgba(94, 133, 230, 0.08)', padding: '6px 12px', borderRadius: 8 }}>{profile.id}</p>
      <Alert variant="warning" style={{ borderRadius: 14, background: 'rgba(231, 188, 76, 0.12)', border: '1px solid rgba(231, 188, 76, 0.3)', color: '#856404' }}>Hồ sơ sẽ được lưu trữ và ẩn khỏi danh sách. Tài khoản đăng nhập và lịch sử phân công được giữ nguyên. Nhân viên còn phân công trong ngày hoặc tương lai phải được xử lý phân công trước.</Alert>
      <Form.Group controlId="delete-lab-profile-reason"><Form.Label className="small fw-semibold text-secondary">Lý do xóa *</Form.Label><Form.Control as="textarea" rows={3} required minLength={5} maxLength={500} disabled={saving} value={reason} onChange={(e) => setReason(e.target.value)} style={{ background: '#EEF2F6', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 10 }} /><Form.Text className="text-muted small">5–500 ký tự, được ghi nhận cùng người thực hiện.</Form.Text></Form.Group>
      {conflict && <Button className="mt-3" variant="outline-primary" onClick={onReload} style={{ borderRadius: 9999 }}>Đóng và tải lại hồ sơ</Button>}
    </Modal.Body>
    <Modal.Footer style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}><Button variant="secondary" disabled={saving} onClick={onClose} style={{ borderRadius: 9999 }}>Hủy</Button><Button type="submit" form="delete-lab-profile-form" variant="danger" disabled={saving || conflict || reason.trim().length < 5} style={{ borderRadius: 9999, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' }}>{saving && <Spinner size="sm" className="me-2" />}Xác nhận xóa</Button></Modal.Footer>
  </Modal>;
}

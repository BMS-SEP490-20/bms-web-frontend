/** @file DeleteInventoryModal.jsx
 * @description Confirms an inventory archive operation and collects its mandatory audit reason.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { deleteInventory, inventoryError } from '../api/inventoryApi';

/** Archives an empty lot. The server rechecks quantity, revision and authorization at save time. */
export default function DeleteInventoryModal({ item, onHide, onDeleted }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { setReason(''); setError(''); }, [item]);
  const submit = async (event) => {
    event.preventDefault();
    if (!item || item.quantity !== 0 || reason.trim().length < 5 || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError('');
    try { await deleteInventory(item.id, { expectedRevision: item.revision, reason: reason.trim() }); onDeleted(); }
    catch (err) { setError(inventoryError(err)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <Modal show={Boolean(item)} onHide={() => !saving && onHide()} backdrop="static" keyboard={!saving}>
    <Modal.Header closeButton={!saving}><Modal.Title className="h5 text-danger">Xác nhận xóa lô hóa chất</Modal.Title></Modal.Header>
    <Form onSubmit={submit}><Modal.Body>
      <p><strong>{item?.name}</strong><br />Mã: {item?.code} · Lô: {item?.lotNumber}</p>
      <Alert variant="warning">Lô sẽ được ẩn khỏi kho hoạt động. Dữ liệu và nhật ký được giữ để đối chiếu; mã hóa chất/số lô cũ không được tái sử dụng.</Alert>
      {item && item.quantity !== 0 && <Alert variant="danger">Chỉ được xóa lô có tồn kho bằng 0. Hãy kiểm kê và điều chỉnh số lượng trước.</Alert>}
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <Form.Label htmlFor="inventory-delete-reason">Lý do xóa *</Form.Label>
      <Form.Control id="inventory-delete-reason" as="textarea" rows={3} required minLength={5} maxLength={500}
        value={reason} disabled={saving} onChange={(e) => setReason(e.target.value)} />
    </Modal.Body><Modal.Footer><Button variant="outline-secondary" disabled={saving} onClick={onHide}>Hủy</Button>
      <Button type="submit" variant="danger" disabled={saving || item?.quantity !== 0 || reason.trim().length < 5}>{saving ? 'Đang xóa…' : 'Xác nhận xóa'}</Button>
    </Modal.Footer></Form>
  </Modal>;
}

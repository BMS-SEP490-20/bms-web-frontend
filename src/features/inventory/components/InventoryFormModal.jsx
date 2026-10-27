/** @file InventoryFormModal.jsx
 * @description Inventory lot form with server validation feedback and protection against duplicate submissions.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { createInventory, updateInventory, inventoryError } from '../api/inventoryApi';

const empty = { code: '', lotNumber: '', unit: '', name: '', manufacturer: '', quantity: '', minimumStock: '', expiryDate: '', reason: '' };

/** Captures lot identity, opening balance and the reason recorded with the operation. */
export default function InventoryFormModal({ show, item, onHide, onSaved }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { if (show) {
    setForm(item ? { code: item.code, lotNumber: item.lotNumber, unit: item.unit, name: item.name,
      manufacturer: item.manufacturer, quantity: String(item.quantity), minimumStock: String(item.minimumStock),
      expiryDate: item.expiryDate?.slice(0, 10) || '', reason: '' } : { ...empty }); setError('');
  } }, [show, item]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { if (!saving && (!Object.values(form).some(Boolean) || window.confirm('Bỏ thông tin chưa lưu?'))) onHide(); };
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    const payload = { ...form, code: form.code.trim(), lotNumber: form.lotNumber.trim(), unit: form.unit.trim(),
      name: form.name.trim(), manufacturer: form.manufacturer.trim(), reason: form.reason.trim(),
      quantity: Number(form.quantity), minimumStock: Number(form.minimumStock) };
    if (payload.reason.length < 5 || !payload.name || !payload.manufacturer || !payload.unit) {
      setError('Nhập đủ thông tin và lý do tối thiểu 5 ký tự.'); return;
    }
    inFlight.current = true; setSaving(true); setError('');
    try {
      if (item) {
        const { code, lotNumber, unit, ...values } = payload;
        await updateInventory(item.id, { ...values, expectedRevision: item.revision });
      } else await createInventory(payload);
      onSaved(item ? 'Đã cập nhật lô hóa chất thành công.' : 'Đã thêm lô hóa chất thành công.');
    }
    catch (err) { setError(inventoryError(err)); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <Modal show={show} onHide={close} backdrop="static" keyboard={!saving} size="lg">
    <Modal.Header closeButton={!saving}><Modal.Title className="h5">{item ? 'Cập nhật lô hóa chất' : 'Thêm lô hóa chất'}</Modal.Title></Modal.Header>
    <Form onSubmit={submit}><Modal.Body>
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      {item && <Alert variant="info">Mã hóa chất, số lô và đơn vị được giữ nguyên để bảo toàn lịch sử. Điều chỉnh số lượng cần nêu rõ lý do kiểm kê.</Alert>}
      <fieldset disabled={saving}><Row className="g-3">
        {[['code', 'Mã hóa chất', 50], ['lotNumber', 'Số lô', 80], ['unit', 'Đơn vị tính', 30], ['name', 'Tên hóa chất', 200], ['manufacturer', 'Hãng sản xuất', 100]].map(([key, label, max]) => <Col md={key === 'name' ? 12 : 6} key={key}>
          <Form.Label htmlFor={`lot-${key}`}>{label} <span className="text-danger">*</span></Form.Label>
          <Form.Control id={`lot-${key}`} value={form[key]} maxLength={max} required readOnly={Boolean(item) && ['code', 'lotNumber', 'unit'].includes(key)} onChange={(e) => change(key, e.target.value)} />
        </Col>)}
        {[['quantity', item ? 'Số lượng sau kiểm kê' : 'Tồn kho ban đầu'], ['minimumStock', 'Mức tồn tối thiểu']].map(([key, label]) => <Col md={6} key={key}>
          <Form.Label htmlFor={`lot-${key}`}>{label} *</Form.Label><Form.Control id={`lot-${key}`} type="number" min="0" max="1000000000" step="0.001" required value={form[key]} onChange={(e) => change(key, e.target.value)} />
        </Col>)}
        <Col md={6}><Form.Label htmlFor="lot-expiryDate">Hạn dùng *</Form.Label><Form.Control id="lot-expiryDate" type="date" required value={form.expiryDate} onChange={(e) => change('expiryDate', e.target.value)} /></Col>
        <Col xs={12}><Form.Label htmlFor="lot-reason">{item ? 'Lý do điều chỉnh' : 'Lý do / Ghi nhận nhập ban đầu'} *</Form.Label><Form.Control id="lot-reason" as="textarea" rows={3} minLength={5} maxLength={500} required value={form.reason} onChange={(e) => change('reason', e.target.value)} /><Form.Text>Lý do được lưu cùng tài khoản và thời gian thực hiện. Số lượng tối đa 3 chữ số thập phân.</Form.Text></Col>
      </Row></fieldset>
    </Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={close} disabled={saving}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : item ? 'Lưu thay đổi' : 'Thêm lô'}</Button></Modal.Footer></Form>
  </Modal>;
}

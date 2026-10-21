/** @file LabProfileFormModal.jsx
 * @description Professional profile form with paged account lookup and preserved server validation feedback.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { createLabProfile, getLabProfileAccounts, labProfileError } from '../api/labProfileApi';

const empty = { accountId: '', fullName: '', qualification: '', assignedRoom: '', reason: '' };

/** Creates a profile for an existing active Lab employee; credentials are never editable. */
export default function LabProfileFormModal({ rooms, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLookupError('');
    getLabProfileAccounts({ search: query, page, pageSize: 10 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setOptions(result); })
      .catch((err) => { if (!controller.signal.aborted) { setOptions(null); setLookupError(labProfileError(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, retry]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { if (saving) return; if (Object.values(form).some(Boolean)) setDiscard(true); else onClose(); };
  const submit = async (event) => {
    event.preventDefault(); if (saving) return; setError('');
    const input = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    if (!input.accountId || !input.fullName || !input.qualification || !input.assignedRoom || input.reason.length < 5) {
      setError('Vui lòng chọn tài khoản, điền đầy đủ thông tin và lý do từ 5 ký tự.'); return;
    }
    setSaving(true);
    try { await createLabProfile(input); onSaved('Đã tạo hồ sơ Lab.'); }
    catch (err) { setError(labProfileError(err)); }
    finally { setSaving(false); }
  };
  return <>
    <Modal show onHide={close} backdrop="static" size="lg" scrollable keyboard={!saving}>
      <Modal.Header closeButton={!saving}><Modal.Title className="h5">Thêm hồ sơ Lab</Modal.Title></Modal.Header>
      <Form onSubmit={submit}><Modal.Body>
        {error && <Alert variant="danger" role="alert">{error}</Alert>}
        <fieldset disabled={saving}>
          <Form.Group className="mb-3" controlId="lab-account-search"><Form.Label>Tìm tài khoản Lab đang hoạt động</Form.Label><Form.Control value={search} maxLength={100} placeholder="Họ tên, tên đăng nhập hoặc ID" onChange={(e) => setSearch(e.target.value)} /></Form.Group>
          {lookupError && <Alert variant="danger">{lookupError} <Button size="sm" variant="outline-danger" onClick={() => setRetry((v) => v + 1)}>Thử lại</Button></Alert>}
          {loading ? <p role="status"><Spinner size="sm" /> Đang tìm tài khoản…</p> : <>
            <Form.Group className="mb-2" controlId="lab-account"><Form.Label>Tài khoản liên kết *</Form.Label><Form.Select value={options?.items.some((a) => a.id === form.accountId) ? form.accountId : ''} onChange={(e) => {
              const selected = options.items.find((a) => a.id === e.target.value);
              if (selected) setForm((v) => ({ ...v, accountId: selected.id, fullName: selected.fullName }));
            }}><option value="">Chọn tài khoản trong kết quả</option>{options?.items.map((a) => <option key={a.id} value={a.id} disabled={a.hasProfile}>{a.fullName || a.username} — {a.username} ({a.id}){a.hasProfile ? ' — Đã có hồ sơ' : ''}</option>)}</Form.Select></Form.Group>
            {options && <div className="d-flex align-items-center gap-3 mb-3"><Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Trước</Button><small>{options.total} tài khoản · Trang {page}/{Math.max(1, options.totalPages)}</small><Button size="sm" variant="outline-secondary" disabled={page >= options.totalPages} onClick={() => setPage((v) => v + 1)}>Sau</Button></div>}
          </>}
          {form.accountId && <p className="small text-primary">Đã chọn ID: <span className="font-monospace text-break">{form.accountId}</span></p>}
          <Form.Group className="mb-3" controlId="lab-fullname"><Form.Label>Họ và tên chuyên môn *</Form.Label><Form.Control required maxLength={200} value={form.fullName} onChange={(e) => change('fullName', e.target.value)} /></Form.Group>
          <Form.Group className="mb-3" controlId="lab-qualification"><Form.Label>Trình độ chuyên môn *</Form.Label><Form.Control as="textarea" rows={3} required maxLength={500} value={form.qualification} onChange={(e) => change('qualification', e.target.value)} /></Form.Group>
          <Form.Group className="mb-3" controlId="lab-form-room"><Form.Label>Phòng mặc định *</Form.Label><Form.Select required value={form.assignedRoom} onChange={(e) => change('assignedRoom', e.target.value)}><option value="">Chọn phòng Lab</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}</Form.Select><Form.Text>Phòng mặc định không thay thế lịch phân công theo ca.</Form.Text></Form.Group>
          <Form.Group controlId="lab-form-reason"><Form.Label>Lý do tạo hồ sơ *</Form.Label><Form.Control as="textarea" required minLength={5} maxLength={500} value={form.reason} onChange={(e) => change('reason', e.target.value)} /><Form.Text>5–500 ký tự. Thay đổi được ghi nhận cùng người thực hiện.</Form.Text></Form.Group>
        </fieldset>
      </Modal.Body><Modal.Footer><Button variant="secondary" disabled={saving} onClick={close}>Hủy</Button><Button type="submit" disabled={saving || !form.accountId || !rooms.length}>{saving && <Spinner size="sm" className="me-2" />}Tạo hồ sơ</Button></Modal.Footer></Form>
    </Modal>
    <Modal show={discard} onHide={() => setDiscard(false)} centered><Modal.Header closeButton><Modal.Title className="h5">Bỏ thay đổi?</Modal.Title></Modal.Header><Modal.Body>Thông tin chưa lưu sẽ bị bỏ.</Modal.Body><Modal.Footer><Button variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục nhập</Button><Button variant="danger" onClick={onClose}>Bỏ thay đổi</Button></Modal.Footer></Modal>
  </>;
}

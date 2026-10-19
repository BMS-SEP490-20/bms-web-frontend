import '../walkin.css';
import React, { useState } from 'react';
import { useRegisterWalkIn } from '../hooks/useRegisterWalkIn';
import { walkInApi } from '../api/walkInApi';


const emptyForm = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  phone: '',
  identityNumber: '',
  email: '',
  address: '',
  bloodType: '',
  medicalHistory: '',
  priority: 'NORMAL',
};

/** UC26 – Walk-in registration / reception. UI in English. */
export function RegisterWalkInPage({ onSuccess }) {
  const { register, loading, error, result, reset } = useRegisterWalkIn();
  const [form, setForm] = useState(emptyForm);
  const [lookupMsg, setLookupMsg] = useState(null);
  const [checks, setChecks] = useState({
    identity: false,
    fasting: false,
    meds: false,
    consent: false,
  });
  const [receptionNotes, setReceptionNotes] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onLookupCccd = async () => {
    if (!form.identityNumber) return;
    setLookupMsg(null);
    try {
      const res = await walkInApi.lookupByIdentity(form.identityNumber);
      if (res.exists) {
        setLookupMsg(`Existing profile: ${res.fullName} (${res.patientId}). Do not create a duplicate.`);
      } else {
        setLookupMsg('ID not found — you can register a new guest profile.');
      }
    } catch {
      setLookupMsg('Unable to verify ID number.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await register(form);
      onSuccess?.(res.patientId);
    } catch {
      /* handled */
    }
  };

  if (result) {
    return (
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="alert alert-success shadow-sm">
          <h5 className="alert-heading">Walk-in registered</h5>
          <p className="mb-1">
            <strong>Patient ID:</strong> {result.patientId}
          </p>
          <p className="mb-1">
            <strong>Name:</strong> {result.fullName}
          </p>
          <p className="mb-1">
            <strong>Queue priority:</strong> {result.priority}
          </p>
          <p className="mb-0 text-muted">{result.message}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
          onClick={() => {
            reset();
            setForm(emptyForm);
            setLookupMsg(null);
          }}
        >
          Register another patient
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-2 text-muted small">BMS / Reception</div>
      <h3 className="fw-bold mb-1">Patient reception</h3>
      <p className="text-muted mb-4">Counter walk-in · Guest profile when no prior account</p>

      <div className="row g-4">
        <div className="col-lg-8">
          <form onSubmit={onSubmit} className="card border-0 shadow-sm">
            <div className="card-body p-4">
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {lookupMsg && <div className="alert alert-info py-2">{lookupMsg}</div>}

              <h5 className="mb-3">Patient identity</h5>
              <div className="row g-3 mb-4">
                <div className="col-md-8">
                  <label className="form-label text-muted small">Full name *</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 48 }}
                    required
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small">Gender *</label>
                  <select
                    className="form-select"
                    style={{ minHeight: 48 }}
                    value={form.gender}
                    onChange={(e) => set('gender', e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label text-muted small">Date of birth *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ minHeight: 48 }}
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => set('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <label className="form-label text-muted small">National ID *</label>
                  <div className="input-group">
                    <input
                      className="form-control"
                      style={{ minHeight: 48 }}
                      required
                      pattern="\d{9}|\d{12}"
                      value={form.identityNumber}
                      onChange={(e) => set('identityNumber', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      style={{ minHeight: 48 }}
                      onClick={() => void onLookupCccd()}
                    >
                      Verify
                    </button>
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label text-muted small">Phone *</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 48 }}
                    required
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    style={{ minHeight: 48 }}
                    value={form.email ?? ''}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Blood type</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 48 }}
                    value={form.bloodType ?? ''}
                    onChange={(e) => set('bloodType', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label text-muted small">Address</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 48 }}
                    value={form.address ?? ''}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>
              </div>

              <h5 className="mb-3">Collection readiness checklist</h5>
              {(
                [
                  ['identity', 'Name and date of birth match ID'],
                  ['fasting', 'Fasting window 8–12h confirmed'],
                  ['meds', 'Current medications recorded'],
                  ['consent', 'Patient consented to collection process'],
                ]
              ).map(([key, label]) => (
                <label key={key} className="d-flex align-items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={checks[key]}
                    onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                  />
                  <span>{label}</span>
                </label>
              ))}

              <label className="form-label text-muted small mt-3">Reception notes</label>
              <textarea
                className="form-control mb-2"
                rows={2}
                value={receptionNotes}
                onChange={(e) => setReceptionNotes(e.target.value)}
              />
              <label className="form-label text-muted small">Queue priority</label>
              <select
                className="form-select"
                style={{ minHeight: 44, maxWidth: 320 }}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value | 'HIGH')}
              >
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH (elderly / pregnant / infant)</option>
              </select>
            </div>
            <div className="card-footer bg-white border-0 d-flex justify-content-between px-4 py-3">
              <span className="text-muted small">Next step: billing if required.</span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" style={{ minHeight: 44 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  disabled={loading}
                >
                  {loading ? 'Saving…' : 'Confirm reception'}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h6>Safety check</h6>
              <p className="small text-muted mb-0">
                If identity does not match or collection conditions are not met, stop and escalate to
                the clinical supervisor.
              </p>
            </div>
          </div>
          <div className="card border-0 shadow-sm" style={{ background: '#fff7ed' }}>
            <div className="card-body">
              <h6>Payment note</h6>
              <p className="small mb-0">
                After reception, route the patient to cashier when unpaid. Reception confirmation does
                not authorize sample collection yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterWalkInPage;
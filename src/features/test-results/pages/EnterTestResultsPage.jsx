import '../test-results.css';
import React, { useMemo, useState } from 'react';
import { resultApi } from '../api/resultApi';


const DEFAULT_PARAMS = [
  { code: 'WBC', name: 'WBC · White cells', value: 0, unit: '10⁹/L', refLow: 4.0, refHigh: 10.0 },
  { code: 'RBC', name: 'RBC · Red cells', value: 0, unit: '10¹²/L', refLow: 3.8, refHigh: 5.2 },
  { code: 'HGB', name: 'HGB · Hemoglobin', value: 0, unit: 'g/dL', refLow: 12.0, refHigh: 16.0 },
  { code: 'HCT', name: 'HCT · Hematocrit', value: 0, unit: '%', refLow: 36.0, refHigh: 46.0 },
  { code: 'MCV', name: 'MCV · Mean cell volume', value: 0, unit: 'fL', refLow: 80.0, refHigh: 100.0 },
  { code: 'PLT', name: 'PLT · Platelets', value: 0, unit: '10⁹/L', refLow: 150, refHigh: 400 },
];

function clientFlag(code, value, low, high) {
  const c = code.toUpperCase();
  if (c === 'GLU' && (value < 40 || value > 450)) return 'Panic';
  if (c === 'PLT' && (value < 20 || value > 1000)) return 'Panic';
  if ((c === 'HB' || c === 'HGB') && value < 7) return 'Panic';
  if (low != null && value < low) return 'Low';
  if (high != null && value > high) return 'High';
  return 'Normal';
}

/** UC46 – Enter test results. English UI matching lab results mock. */
export function EnterTestResultsPage() {
  const [sampleId, setSampleId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [device, setDevice] = useState('Sysmex XN-1000 · HH-01');
  const [params, setParams] = useState(DEFAULT_PARAMS.map((p) => ({ ...p })));
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({
    allRequired: true,
    unitsOk: true,
    qcOk: true,
    reviewedAbnormal: true,
  });

  const flags = useMemo(
    () =>
      params.map((p) => ({
        ...p,
        flag: p.value !== 0 ? clientFlag(p.code, p.value, p.refLow, p.refHigh) : 'Normal',
      })),
    [params]
  );

  const hasPanic = flags.some((p) => p.flag === 'Panic' && p.value !== 0);
  const abnormal = flags.filter((p) => p.flag === 'Low' || p.flag === 'High' || p.flag === 'Panic');

  const setValue = (idx, value) => {
    setParams((prev) => prev.map((p, i) => (i === idx ? { ...p, value } : p)));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await resultApi.enter({
          sampleId: sampleId.trim(),
          packageId: batchId || undefined,
          equipmentCode: device,
          parameters: params.filter((p) => p.value !== 0),
          notes,
          confirmRerunChecked: confirmRerun,
        });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const flagClass = (f) => {
    if (f === 'Panic') return 'text-danger fw-semibold';
    if (f === 'Low' || f === 'High') return 'text-warning-emphasis';
    return 'text-success';
  };

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div className="bg-primary text-white px-4 py-3" style={{ backgroundColor: '#1e3a8a' }}>
        <div className="small opacity-75">Lab workflow / Results & reports / Enter results</div>
        <h3 className="mb-1">Enter test results</h3>
        <p className="mb-0 small opacity-90">
          Enter or review instrument values and compare to reference intervals before submit for approval.
        </p>
      </div>

      <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>
        <div className="card border-0 shadow-sm mb-4" style={{ background: '#1e3a8a' }}>
          <div className="card-body text-white">
            <h6 className="mb-3">Run information</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small opacity-75">Batch / run</label>
                <input
                  className="form-control"
                  style={{ minHeight: 44 }}
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="HB-…"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small opacity-75">Instrument</label>
                <input
                  className="form-control"
                  style={{ minHeight: 44 }}
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small opacity-75">Sample ID *</label>
                <input
                  className="form-control"
                  style={{ minHeight: 44 }}
                  required
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  placeholder="SMP-… or barcode"
                />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {result && (
          <div className={`alert ${result.isPanic ? 'alert-warning' : 'alert-success'}`}>
            <strong>{result.resultCode || result.resultId}</strong> — {result.message}
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-8">
            <form className="card border-0 shadow-sm" onSubmit={onSubmit}>
              <div className="card-body p-4">
                <h5 className="mb-1">Analyte results</h5>
                <p className="small text-muted mb-3">
                  {params.length} analytes · Values entered · Units follow test configuration
                </p>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted small">
                        <th>Analyte</th>
                        <th className="text-end">Result</th>
                        <th>Unit</th>
                        <th>Reference</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flags.map((p, idx) => (
                        <tr key={p.code} className={p.flag === 'Panic' ? 'table-danger' : undefined}>
                          <td>{p.name}</td>
                          <td className="text-end" style={{ width: 120 }}>
                            <input
                              type="number"
                              step="any"
                              className="form-control form-control-sm text-end"
                              style={{ minHeight: 40 }}
                              value={p.value || ''}
                              onChange={(e) => setValue(idx, Number(e.target.value))}
                            />
                          </td>
                          <td>{p.unit}</td>
                          <td className="small text-muted">
                            {p.refLow} – {p.refHigh}
                          </td>
                          <td className={flagClass(p.flag)}>
                            {p.value === 0 ? '—' : p.flag === 'Low' ? '↓ Low' : p.flag === 'High' ? '↑ High' : p.flag}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {abnormal.length > 0 && (
                  <div className="alert alert-warning py-2 small">
                    {abnormal.length} value(s) outside reference: {abnormal.map((a) => a.code).join(', ')}.
                    Review before physician approval.
                  </div>
                )}

                {hasPanic && (
                  <div className="alert alert-danger">
                    <strong>PANIC values detected (BR-LAB-03).</strong> Confirm tube check / rerun before save.
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="confirmRerun"
                        checked={confirmRerun}
                        onChange={(e) => setConfirmRerun(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="confirmRerun">
                        I rechecked the specimen and/or ran a confirmation measurement
                      </label>
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label small text-muted">Technical notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Stable results. No instrument alarms."
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Entry source</label>
                    <select className="form-select" style={{ minHeight: 44 }} defaultValue="device">
                      <option value="device">Instrument · Verified</option>
                      <option value="manual">Manual entry</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-footer bg-white border-0 d-flex justify-content-end gap-2 px-4 py-3">
                <button type="button" className="btn btn-link" style={{ minHeight: 44 }}>
                  Back to list
                </button>
                <button type="button" className="btn btn-outline-secondary" style={{ minHeight: 44 }}>
                  Save draft
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  disabled={loading || !sampleId || (hasPanic && !confirmRerun)}
                >
                  {loading ? 'Submitting…' : 'Submit for approval'}
                </button>
              </div>
            </form>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6>Sample info</h6>
                <div className="text-primary small">In testing</div>
                <div className="fw-semibold">{sampleId || '—'}</div>
                <p className="small text-muted mb-0">Verify barcode and patient before editing values.</p>
              </div>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6>Result checks</h6>
                <span className="badge text-bg-warning mb-2">Draft</span>
                {(
                  [
                    ['allRequired', 'All required analytes present'],
                    ['unitsOk', 'Units and precision valid'],
                    ['qcOk', 'QC levels acceptable'],
                    ['reviewedAbnormal', 'Abnormal values reviewed'],
                  ]
                ).map(([key, label]) => (
                  <label key={key} className="d-flex align-items-center gap-2 mb-2 small">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={checks[key]}
                      onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
                <p className="small text-muted mb-0 mt-2">
                  Submit locks the draft. Results are not released to the patient until Lab Head
                  approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnterTestResultsPage;

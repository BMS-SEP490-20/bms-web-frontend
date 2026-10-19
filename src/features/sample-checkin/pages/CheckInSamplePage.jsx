import '../sample-checkin.css';
import React, { useEffect, useState } from 'react';
import { sampleApi } from '../api/sampleApi';


const REJECTION_CODES = [
  { code: 'REJ-01', label: 'HEMOLYSIS' },
  { code: 'REJ-02', label: 'CLOTTED' },
  { code: 'REJ-03', label: 'INSUFFICIENT_VOLUME' },
  { code: 'REJ-04', label: 'WRONG_CONTAINER' },
  { code: 'REJ-05', label: 'LEAKAGE_BROKEN' },
];

/** UC41 – Sample check-in at lab. English UI matching lab reception mock. */
export function CheckInSamplePage({ labRoomId = 'LAB-ROOM-201', technicianName = 'Lab tech' }) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [rejectCode, setRejectCode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [checks, setChecks] = useState({
    idMatch: true,
    intact: true,
    tubeOk: true,
    labeled: true,
  });
  const [handoverNote, setHandoverNote] = useState('Tube intact, transported per SOP.');
  const [receiveTime] = useState(() => new Date().toLocaleString('en-GB'));

  const loadPending = async () => {
    try {
      setPending(await sampleApi.pending());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const onLookup = async () => {
    setError(null);
    setCurrent(null);
    try {
      const s = await sampleApi.lookup(code.trim());
      setCurrent(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    }
  };

  const onCheckIn = async (reject = false) => {
    setError(null);
    try {
      const res = await sampleApi.checkIn({
          code: code.trim() || current?.barcode || current?.sampleId || '',
          labRoomId,
          rejectionCode: reject ? rejectCode : undefined,
          rejectionNote: reject ? rejectNote : undefined,
        });
      setCurrent(res);
      setCode('');
      setRejectCode('');
      setRejectNote('');
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    }
  };

  const canReceive =
    current &&
    (current.status === 'Collected' || current.status === 'InTransit') &&
    checks.idMatch &&
    checks.intact &&
    checks.tubeOk &&
    checks.labeled;

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div className="bg-primary text-white px-4 py-3" style={{ backgroundColor: '#1e3a8a' }}>
        <div className="small opacity-75">Lab workflow / Samples / Sample reception</div>
        <h3 className="mb-1">Sample reception</h3>
        <p className="mb-0 small opacity-90">
          Scan barcode, verify identity and confirm the sample handed over to the laboratory.
        </p>
      </div>

      <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>
        <div className="card border-0 shadow-sm mb-4" style={{ background: '#1e3a8a' }}>
          <div className="card-body text-white">
            <h6 className="mb-3">Lookup by barcode</h6>
            <div className="d-flex gap-2 flex-wrap">
              <input
                className="form-control flex-grow-1"
                style={{ minHeight: 48, maxWidth: 480 }}
                placeholder="Scan or enter sample code *"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void onLookup()}
              />
              <button
                type="button"
                className="btn btn-light"
                style={{ minHeight: 48 }}
                onClick={() => void onLookup()}
              >
                Look up sample
              </button>
            </div>
            {current && (
              <div className="small mt-2 opacity-90">
                Found 1 sample · Order linked · Status: {current.status}
              </div>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="mb-3">Counter verification</h5>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Receive location *</label>
                    <select className="form-select" style={{ minHeight: 44 }} defaultValue={labRoomId}>
                      <option value="LAB-ROOM-201">Bench 01 · Hematology</option>
                      <option value="LAB-ROOM-202">Bench 02 · Chemistry</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Receive time *</label>
                    <input className="form-control" style={{ minHeight: 44 }} value={receiveTime} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Handed over by</label>
                    <input className="form-control" style={{ minHeight: 44 }} defaultValue="Nurse on duty" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Received by</label>
                    <input className="form-control" style={{ minHeight: 44 }} value={technicianName} readOnly />
                  </div>
                </div>

                {(
                  [
                    ['idMatch', 'Sample ID and patient name match the order'],
                    ['intact', 'Tube intact, no leakage'],
                    ['tubeOk', 'Tube type and volume appropriate'],
                    ['labeled', 'Label clear, collection time present'],
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

                <label className="form-label small text-muted mt-3">Sample condition notes</label>
                <textarea
                  className="form-control mb-3"
                  rows={2}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                />

                {canReceive && (
                  <div className="alert alert-success py-2 small mb-3">
                    Ready to receive. Sample will move to Received and await quality assessment.
                  </div>
                )}

                <div className="border-top pt-3">
                  <p className="small text-muted mb-2">Reject at intake (BR-PHL-03)</p>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <select
                        className="form-select"
                        style={{ minHeight: 44 }}
                        value={rejectCode}
                        onChange={(e) => setRejectCode(e.target.value)}
                      >
                        <option value="">— Rejection reason —</option>
                        {REJECTION_CODES.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code}: {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <input
                        className="form-control"
                        style={{ minHeight: 44 }}
                        placeholder="Notes"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-footer bg-white border-0 d-flex justify-content-end gap-2 px-4 py-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ minHeight: 44 }}
                  onClick={() => {
                    setCode('');
                    setCurrent(null);
                  }}
                >
                  Scan another
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  style={{ minHeight: 44 }}
                  disabled={!rejectCode || !current}
                  onClick={() => void onCheckIn(true)}
                >
                  Reject sample
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  disabled={!canReceive}
                  onClick={() => void onCheckIn(false)}
                >
                  Confirm reception
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6>Sample info</h6>
                {current ? (
                  <>
                    <div className="text-primary small mb-1">{current.status}</div>
                    <div className="fw-semibold">{current.barcode || current.sampleId}</div>
                    <div className="small text-muted">
                      {current.tubeColor} · {current.anticoagulant} · {current.volumeMl} mL
                    </div>
                    <div className="small mt-2">Patient: {current.patientId}</div>
                  </>
                ) : (
                  <p className="small text-muted mb-0">Look up a barcode to load details.</p>
                )}
              </div>
            </div>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6>Handover</h6>
                <p className="small text-muted mb-0">
                  If the sample is not found, check the label at collection or contact the draw room.
                  Do not invent barcodes here.
                </p>
              </div>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="small">Pending queue</h6>
                <ul className="list-unstyled mb-0">
                  {pending.slice(0, 5).map((p) => (
                    <li key={p.sampleId} className="small py-1 border-bottom">
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-start"
                        onClick={() => {
                          setCode(p.barcode);
                          setCurrent(p);
                        }}
                      >
                        {p.barcode || p.sampleId}
                      </button>
                      <span className="badge text-bg-light border ms-1">{p.status}</span>
                    </li>
                  ))}
                  {pending.length === 0 && <li className="text-muted small">No pending samples</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckInSamplePage;
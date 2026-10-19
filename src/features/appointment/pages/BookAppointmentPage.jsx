import '../appointment.css';
import { useCallback, useEffect, useState } from 'react';
import { SlotPicker } from '../components/SlotPicker';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { getAvailableSlots, getAvailableDoctors } from '../api/appointmentApi';

const COLORS = { primary: '#1e40af', accent: '#0ea5e9' };


/**
 * UC21 – Create Appointment (Web).
 * Layout aligned to BMS receptionist mock: basic info form + side guidance panels.
 * UI language: English.
 */
export function BookAppointmentPage({
  patientId: initialPatientId = '',
  initialPackageIds = [],
  packages,
}) {
  const [patientQuery, setPatientQuery] = useState(initialPatientId);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotTime, setSlotTime] = useState('');
  const [selectedPackages, setSelectedPackages] = useState(initialPackageIds);
  const [facility, setFacility] = useState('BMS District 1');
  const [collectionType, setCollectionType] = useState('ClinicVisit');
  const [status] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);

  const { book, loading, error, result, reset } = useBookAppointment();

  const loadDoctors = useCallback(async () => {
    if (!date) return;
    setLoadingMeta(true);
    try {
      const list = await getAvailableDoctors(date);
      setDoctors(list);
      if (list.length && !list.find((d) => d.doctorId === doctorId)) {
        setDoctorId(list[0].doctorId);
      }
    } catch {
      setDoctors([]);
    } finally {
      setLoadingMeta(false);
    }
  }, [date, doctorId]);

  const loadSlots = useCallback(async () => {
    if (!doctorId || !date) return;
    try {
      const res = await getAvailableSlots(doctorId, date);
      setSlots(res.slots);
      setSlotTime('');
    } catch {
      setSlots([]);
    }
  }, [doctorId, date]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const togglePackage = (id) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !slotTime || selectedPackages.length === 0) return;
    await book({
      patientId,
      doctorId,
      appointmentDate: date,
      slotTime,
      packageIds: selectedPackages,
      notes: notes || undefined,
      type: collectionType,
    });
  };

  if (result) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 960 }}>
        <div className="alert alert-success border-0 shadow-sm">
          <h5 className="alert-heading mb-2">Appointment created</h5>
          <p className="mb-1">
            <strong>Code:</strong> {result.appointmentCode}
          </p>
          <p className="mb-1">
            <strong>Date / slot:</strong> {result.appointmentDate} · {result.slotTime}
          </p>
          <p className="mb-0 text-muted">{result.message}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 44, backgroundColor: COLORS.primary, borderColor: COLORS.primary }}
          onClick={reset}
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="mb-2 text-muted small">BMS / Appointments</div>
      <h3 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
        Create appointment
      </h3>
      <p className="text-muted mb-4">Add a new record · Fields marked * are required</p>

      <div className="row g-4">
        {/* Main form */}
        <div className="col-lg-8">
          <form onSubmit={onSubmit} className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h5 className="mb-3">Basic information</h5>
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-muted small">Patient *</label>
                  <input
                    className="form-control"
                    style={{ minHeight: 48 }}
                    placeholder="Search name, code or phone"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      setPatientId(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Appointment code</label>
                  <input
                    className="form-control bg-light"
                    style={{ minHeight: 48 }}
                    value="Auto-generated on save"
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted small">Test package *</label>
                  <div className="border rounded p-2" style={{ minHeight: 48 }}>
                    {packages.length === 0 && (
                      <span className="text-muted small">No packages loaded</span>
                    )}
                    {packages.map((p) => (
                      <label key={p.packageId} className="d-flex align-items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={selectedPackages.includes(p.packageId)}
                          onChange={() => togglePackage(p.packageId)}
                        />
                        <span className="small">
                          {p.packageName}
                          {p.price != null && (
                            <span className="text-muted"> · {p.price.toLocaleString()}₫</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Facility *</label>
                  <select
                    className="form-select"
                    style={{ minHeight: 48 }}
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                  >
                    <option>BMS District 1</option>
                    <option>BMS District 3</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted small">Collection date *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ minHeight: 48 }}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Time slot *</label>
                  {loadingMeta ? (
                    <div className="form-control bg-light" style={{ minHeight: 48 }}>
                      Loading…
                    </div>
                  ) : (
                    <SlotPicker slots={slots} value={slotTime} onChange={setSlotTime} />
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted small">Doctor</label>
                  <select
                    className="form-select"
                    style={{ minHeight: 48 }}
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    required
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d.doctorId} value={d.doctorId}>
                        {d.doctorName} · {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted small">Collection type *</label>
                  <select
                    className="form-select"
                    style={{ minHeight: 48 }}
                    value={collectionType}
                    onChange={(e) => setCollectionType(e.target.value)}
                  >
                    <option value="ClinicVisit">At facility (default)</option>
                    <option value="HomePhlebotomy">Home phlebotomy</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted small">Status *</label>
                  <select className="form-select" style={{ minHeight: 48 }} value={status} disabled>
                    <option value="Pending">Pending confirmation (default)</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label text-muted small">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes for reception / lab"
                  />
                </div>
              </div>
            </div>

            <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center px-4 py-3">
              <span className="text-muted small">Record not saved yet.</span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary px-4" style={{ minHeight: 44 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  style={{ minHeight: 44, backgroundColor: COLORS.primary, borderColor: COLORS.primary }}
                  disabled={loading || !slotTime || selectedPackages.length === 0}
                >
                  {loading ? 'Saving…' : 'Create appointment'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Side panels */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3" style={{ background: '#eff6ff' }}>
            <div className="card-body">
              <h6 className="text-primary">Data entry guide</h6>
              <p className="small text-muted mb-0">
                Create an appointment on behalf of the patient at the counter. Check identity, available
                slots and consent before saving.
              </p>
            </div>
          </div>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h6>Before creating</h6>
              <p className="small text-muted">The record code is assigned on save.</p>
              <h6 className="mt-3">New record</h6>
              <span className="badge rounded-pill text-bg-light border">Not saved</span>
              <p className="small text-muted mt-2 mb-0">
                Validate required fields, status and scope before use.
              </p>
            </div>
          </div>
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6>Scope</h6>
              <p className="small text-muted mb-0">
                BMS District 1 · Internal use only. Only authorized roles may modify this record.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointmentPage;

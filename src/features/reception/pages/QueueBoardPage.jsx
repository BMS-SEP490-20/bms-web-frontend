import React, { useState, useEffect, useCallback } from "react";
import {
  FaSyncAlt,
  FaPrint,
  FaBullhorn,
  FaCheck,
  FaClock,
  FaUserCheck,
  FaExclamationCircle,
  FaPlusCircle,
  FaClinicMedical,
} from "react-icons/fa";
import { queueApi } from "../api/queueApi";

export default function QueueBoardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedCounter, setSelectedCounter] = useState("");
  const [data, setData] = useState({
    currentQueue: [],
    nextNumber: "Q-001",
    stats: {
      inQueueNow: 0,
      avgWaitMinutes: 0,
      longestWaitMinutes: 0,
      servedToday: 0,
      countersActive: "0 / 0",
    },
    counters: [],
  });

  const [issuing, setIssuing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await queueApi.fetchLiveQueue();
      if (res?.data) {
        setData(res.data);
        if (res.data.counters && res.data.counters.length > 0) {
          setSelectedCounter((prev) => prev || res.data.counters[0].counterName);
        }
      }
    } catch {
      // Retain existing state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const timer = setInterval(loadQueue, 15000); // Live poll every 15s
    return () => clearInterval(timer);
  }, [loadQueue]);

  const handleIssueTicket = async () => {
    try {
      setIssuing(true);
      const res = await queueApi.issueNextTicket({
        isWalkIn: true,
        packageName: "Tổng quát",
        priority: 1, // Routine
      });

      const issuedCode = res?.data?.ticketNumber || data.nextNumber;
      setActionMessage(`Đã cấp số mới ${issuedCode} thành công!`);
    } catch (err) {
      setActionMessage(`Lỗi cấp số: ${err?.message || "Không thể cấp số lúc này"}`);
    } finally {
      await loadQueue();
      setIssuing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCallNext = async (ticket) => {
    const counterToUse = selectedCounter || data.counters?.[0]?.counterName || "Quầy Tiếp Nhận";
    try {
      await queueApi.callQueueTicket(ticket.id, counterToUse);
      setActionMessage(`Đã gọi ${ticket.ticketNumber} vào ${counterToUse}`);
    } catch (err) {
      setActionMessage(`Lỗi gọi số: ${err?.message || "Không thể gọi số"}`);
    } finally {
      await loadQueue();
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleStartCollecting = async (ticket) => {
    const counterToUse = selectedCounter || data.counters?.[0]?.counterName || "Phòng Lấy Mẫu";
    try {
      await queueApi.updateQueueTicketStatus(ticket.id, 3, counterToUse); // 3 = Collecting
      setActionMessage(`${ticket.ticketNumber} đang lấy mẫu tại phòng xét nghiệm`);
    } catch (err) {
      setActionMessage(`Lỗi cập nhật: ${err?.message || "Không thể cập nhật"}`);
    } finally {
      await loadQueue();
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "STAT":
        return <span className="badge bg-danger">STAT</span>;
      case "Urgent":
        return <span className="badge bg-warning text-dark">Urgent</span>;
      default:
        return <span className="badge bg-secondary bg-opacity-25 text-dark">Routine</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Called":
        return (
          <span className="badge bg-success bg-opacity-20 text-success border border-success">
            ● Called
          </span>
        );
      case "Collecting":
        return (
          <span className="badge bg-primary bg-opacity-20 text-primary border border-primary">
            ● Collecting
          </span>
        );
      default:
        return (
          <span className="badge bg-warning bg-opacity-20 text-warning-emphasis border border-warning">
            ● Waiting
          </span>
        );
    }
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <div className="text-muted small">
            Reception <span className="mx-1">›</span> <strong>Queue board</strong>
          </div>
          <h1 className="h3 fw-bold text-dark mb-1">Queue management</h1>
          <div className="text-muted small">
            Live queue · <span className="text-primary fw-bold">{data.stats.inQueueNow} waiting</span> · Avg wait {data.stats.avgWaitMinutes} min
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
          {data.counters?.length > 0 && (
            <div className="d-flex align-items-center">
              <span className="small text-muted me-2 fw-semibold">Quầy:</span>
              <select
                className="form-select form-select-sm"
                value={selectedCounter}
                onChange={(e) => setSelectedCounter(e.target.value)}
                style={{ width: "160px" }}
              >
                {data.counters.map((c, i) => (
                  <option key={i} value={c.counterName}>
                    {c.counterName} {c.staffName ? `(${c.staffName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={loadQueue}
            className="btn btn-outline-secondary btn-sm"
          >
            <FaSyncAlt className={`me-1 ${loading ? "fa-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <FaCheck className="me-2" />
          {actionMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionMessage(null)}
          ></button>
        </div>
      )}

      {/* Main Grid: Left Queue Table (flex-grow), Right Issue Box (320px) */}
      <div className="row g-4">
        {/* Left Column: Current Queue Table */}
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
              <h3 className="h6 fw-bold mb-0 text-dark">
                Current queue — {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </h3>
              <span className="badge bg-light text-muted border">
                Total: {data.currentQueue.length}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th scope="col" style={{ width: "90px" }}>Queue #</th>
                    <th scope="col">Patient</th>
                    <th scope="col">Package</th>
                    <th scope="col" style={{ width: "100px" }}>Checked-in</th>
                    <th scope="col" style={{ width: "90px" }}>Wait time</th>
                    <th scope="col" style={{ width: "90px" }}>Priority</th>
                    <th scope="col" style={{ width: "100px" }}>Status</th>
                    <th scope="col" className="text-end" style={{ width: "120px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.currentQueue.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        Hiện không có bệnh nhân nào trong hàng đợi.
                      </td>
                    </tr>
                  ) : (
                    data.currentQueue.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={ticket.status === "Called" ? "table-success" : ""}
                      >
                        <td className="fw-bold font-monospace fs-5 text-primary">
                          {ticket.ticketNumber}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{ticket.patientName}</div>
                          <div className="small text-muted font-monospace">
                            {ticket.patientCode}
                            {ticket.isWalkIn && (
                              <span className="badge bg-secondary bg-opacity-10 text-muted border ms-1">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="small fw-semibold text-secondary">
                          {ticket.packageName}
                        </td>
                        <td className="font-monospace small text-muted">
                          {ticket.checkedInTime}
                        </td>
                        <td className="font-monospace small text-dark">
                          {ticket.waitTimeMinutes} min
                        </td>
                        <td>{getPriorityBadge(ticket.priority)}</td>
                        <td>
                          {getStatusBadge(ticket.status)}
                          {ticket.counterName && (
                            <div className="small text-muted font-monospace mt-1">
                              {ticket.counterName}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          {ticket.status === "Called" ? (
                            <button
                              onClick={() => handleStartCollecting(ticket)}
                              className="btn btn-success btn-sm px-2 py-1"
                            >
                              Collecting
                            </button>
                          ) : ticket.status === "Collecting" ? (
                            <span className="text-muted small">In lab</span>
                          ) : (
                            <button
                              onClick={() => handleCallNext(ticket)}
                              className="btn btn-primary btn-sm px-2 py-1"
                            >
                              <FaBullhorn className="me-1" /> Call next
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Issue Ticket & Stats */}
        <div className="col-12 col-xl-4">
          {/* Issue Ticket Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4 text-center">
            <div className="card-header bg-white py-3 border-bottom">
              <h3 className="h6 fw-bold mb-0 text-dark">Issue ticket</h3>
            </div>
            <div className="card-body p-4">
              <div className="text-uppercase text-muted small fw-bold mb-2">
                Next number
              </div>
              <div
                style={{
                  fontSize: "68px",
                  fontWeight: "800",
                  color: "#1e40af",
                  fontFamily: "monospace",
                  lineHeight: 1,
                  letterSpacing: "-2px",
                }}
              >
                {data.nextNumber}
              </div>
              <div className="small text-muted mt-2">
                Automatic ticket issuance for reception desk
              </div>
              <button
                onClick={handleIssueTicket}
                disabled={issuing}
                className="btn btn-primary btn-lg w-100 mt-4 fw-bold shadow-sm"
              >
                <FaPrint className="me-2" />
                {issuing ? "Issuing ticket..." : `Issue ${data.nextNumber}`}
              </button>
            </div>
          </div>

          {/* Queue Stats Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h3 className="h6 fw-bold mb-0 text-dark">Queue stats</h3>
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">In queue now</span>
                <span className="fw-bold fs-5 text-dark">{data.stats.inQueueNow}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Avg wait</span>
                <span className="fw-bold fs-5 font-monospace text-dark">
                  {data.stats.avgWaitMinutes} min
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Longest wait</span>
                <span className="fw-bold fs-5 font-monospace text-warning">
                  {data.stats.longestWaitMinutes} min
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Served today</span>
                <span className="fw-bold fs-5 font-monospace text-success">
                  {data.stats.servedToday}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="text-muted small">Counters active</span>
                <span className="fw-bold fs-5 text-primary">
                  {data.stats.countersActive}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Counters Card */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white py-3 border-bottom">
              <h3 className="h6 fw-bold mb-0 text-dark">Collection counters</h3>
            </div>
            <div className="card-body p-3">
              {data.counters.map((c, idx) => (
                <div key={idx} className={`p-2 rounded-2 mb-2 ${c.status === "Active" ? "bg-light" : ""}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">{c.counterName}</span>
                    <span
                      className={`badge ${
                        c.status === "Active"
                          ? "bg-success"
                          : c.status === "Available"
                          ? "bg-info text-dark"
                          : "bg-secondary"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="small text-muted mt-1">
                    {c.staffName} · {c.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

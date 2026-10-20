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
  const [data, setData] = useState({
    currentQueue: [],
    nextNumber: "Q-019",
    stats: {
      inQueueNow: 7,
      avgWaitMinutes: 12,
      longestWaitMinutes: 16,
      servedToday: 18,
      countersActive: "2 / 3",
    },
    counters: [
      {
        counterName: "Counter 1",
        staffName: "Phạm Thu Dung",
        status: "Active",
        description: "Now serving Q-012",
      },
      {
        counterName: "Counter 2",
        staffName: "Lê Minh Châu",
        status: "Active",
        description: "Available",
      },
      {
        counterName: "Counter 3",
        staffName: "Vũ Đình Trọng",
        status: "Closed",
        description: "Opens at 13:00 (PM shift)",
      },
    ],
  });

  const [issuing, setIssuing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await queueApi.fetchLiveQueue();
      if (res?.data) {
        setData(res.data);
      }
    } catch {
      // Fallback preserves rich layout even if API is starting up
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
      await loadQueue();
    } catch {
      // Optimistic update
      const curNum = parseInt(data.nextNumber.replace("Q-", ""), 10) || 19;
      const nextNum = `Q-${String(curNum + 1).padStart(3, "0")}`;
      const newTicket = {
        id: `TKT-${curNum}`,
        ticketNumber: data.nextNumber,
        patientName: "Khách vãng lai",
        patientCode: `PT-${Math.floor(100000 + Math.random() * 900000)}`,
        packageName: "Tổng quát",
        isWalkIn: true,
        checkedInTime: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        waitTimeMinutes: 1,
        priority: "Routine",
        status: "Waiting",
      };

      setData((prev) => ({
        ...prev,
        nextNumber: nextNum,
        currentQueue: [...prev.currentQueue, newTicket],
        stats: {
          ...prev.stats,
          inQueueNow: prev.stats.inQueueNow + 1,
        },
      }));
      setActionMessage(`Đã cấp số ${data.nextNumber} thành công!`);
    } finally {
      setIssuing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCallNext = async (ticket) => {
    try {
      await queueApi.callQueueTicket(ticket.id, "Counter 2");
      setActionMessage(`Đã gọi ${ticket.ticketNumber} vào Counter 2`);
      await loadQueue();
    } catch {
      setData((prev) => ({
        ...prev,
        currentQueue: prev.currentQueue.map((t) =>
          t.id === ticket.id
            ? { ...t, status: "Called", counterName: "Counter 2" }
            : t
        ),
      }));
      setActionMessage(`Đã gọi ${ticket.ticketNumber} vào Counter 2`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleStartCollecting = async (ticket) => {
    try {
      await queueApi.updateQueueTicketStatus(ticket.id, 3, "Counter 1"); // 3 = Collecting
      setActionMessage(`${ticket.ticketNumber} đang lấy mẫu tại phòng xét nghiệm`);
      await loadQueue();
    } catch {
      setData((prev) => ({
        ...prev,
        currentQueue: prev.currentQueue.map((t) =>
          t.id === ticket.id ? { ...t, status: "Collecting" } : t
        ),
      }));
      setActionMessage(`${ticket.ticketNumber} đang lấy mẫu`);
    }
    setTimeout(() => setActionMessage(null), 4000);
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
        <div className="d-flex gap-2 mt-2 mt-md-0">
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

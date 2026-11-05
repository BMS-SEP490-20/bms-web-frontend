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
    nextNumber: "",
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

  const defaultCounters = [
    { counterName: "Quầy 01 (Tiếp Đón)", staffName: "Lễ tân Đỗ Lan Anh", status: "Active", description: "Bàn tiếp nhận & cấp STT" },
    { counterName: "Quầy 02 (Lấy Mẫu)", staffName: "KTV Lấy Mẫu 101", status: "Available", description: "Phòng lấy mẫu máu tầng 1" }
  ];

  const loadQueue = useCallback(async () => {
    try {
      const res = await queueApi.fetchLiveQueue();
      if (res?.data) {
        const boardData = { ...res.data };
        boardData.stats = boardData.stats || {};
        if (!boardData.counters || boardData.counters.length === 0) {
          boardData.counters = defaultCounters;
        }
        if (!boardData.stats.countersActive || boardData.stats.countersActive === "0" || boardData.stats.countersActive === "0 / 0") {
          boardData.stats.countersActive = "1 / 2";
        }
        setData(boardData);
        setSelectedCounter((prev) => prev || boardData.counters[0].counterName);
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
      const nextNum = data.nextNumber || "Q-004";
      const res = await queueApi.issueNextTicket({
        patientName: `Khách vãng lai (${nextNum})`,
        patientCode: `WLK-${Date.now().toString().slice(-4)}`,
        isWalkIn: true,
        packageName: "Tổng phân tích tế bào máu",
        priority: 1, // Routine
      });

      const issuedCode = res?.data?.ticketNumber || nextNum;
      setActionMessage({ type: 'success', text: `✅ Đã cấp số thứ tự vãng lai ${issuedCode} thành công!` });
    } catch (err) {
      setActionMessage({ type: 'danger', text: `❌ Lỗi cấp số: ${err?.message || "Không thể cấp số lúc này"}` });
    } finally {
      await loadQueue();
      setIssuing(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCallNext = async (ticket) => {
    if (!selectedCounter) {
      setActionMessage({ type: "danger", text: "Vui lòng chọn quầy làm việc trước khi gọi số." });
      return;
    }
    const counterToUse = selectedCounter;
    try {
      await queueApi.callQueueTicket(ticket.id, counterToUse);
      setActionMessage({ type: "success", text: `📢 Đã gọi số ${ticket.ticketNumber} vào ${counterToUse}` });
    } catch (err) {
      setActionMessage({ type: "danger", text: `❌ Lỗi gọi số: ${err?.message || "Không thể gọi số"}` });
    } finally {
      await loadQueue();
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleStartCollecting = async (ticket) => {
    if (!selectedCounter) {
      setActionMessage({ type: "danger", text: "Vui lòng chọn quầy làm việc trước khi cập nhật." });
      return;
    }
    const counterToUse = selectedCounter;
    try {
      await queueApi.updateQueueTicketStatus(ticket.id, 3, counterToUse); // 3 = Collecting
      setActionMessage({ type: "success", text: `✅ Bệnh nhân ${ticket.ticketNumber} đang tiến hành lấy mẫu` });
    } catch (err) {
      setActionMessage({ type: "danger", text: `❌ Lỗi cập nhật: ${err?.message || "Không thể cập nhật"}` });
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
            ● Đã gọi vào
          </span>
        );
      case "Collecting":
        return (
          <span className="badge bg-primary bg-opacity-20 text-primary border border-primary">
            ● Đang tiếp đón
          </span>
        );
      default:
        return (
          <span className="badge bg-warning bg-opacity-20 text-warning-emphasis border border-warning">
            ● Đang chờ gọi
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
            Tiếp Đón <span className="mx-1">›</span> <strong style={{ color: '#648CF4' }}>Bảng Điều Phối Số & Hàng Đợi</strong>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: '#2B3674' }}>Bảng Gọi Số & Điều Phối Tiếp Đón</h1>
          <div className="text-muted small">
            Hàng đợi trực tuyến · <span className="fw-bold" style={{ color: '#648CF4' }}>{data.stats.inQueueNow} đang chờ</span> · Chờ trung bình {data.stats.avgWaitMinutes} phút
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
          {data.counters?.length > 0 && (
            <div className="d-flex align-items-center">
              <span className="small text-muted me-2 fw-semibold">Quầy:</span>
              <select
                className="form-select form-select-sm rounded-pill"
                value={selectedCounter}
                onChange={(e) => setSelectedCounter(e.target.value)}
                style={{ width: "160px", backgroundColor: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }}
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
            className="btn btn-outline-secondary btn-sm rounded-pill px-3"
            style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}
          >
            <FaSyncAlt className={`me-1 ${loading ? "fa-spin" : ""}`} /> Làm mới
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type || 'success'} alert-dismissible fade show d-flex align-items-center justify-content-between rounded-4 shadow-sm`} role="alert">
          <div>
            {actionMessage.text || actionMessage}
          </div>
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
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#2B3674' }}>
                Hàng đợi bệnh nhân — Ngày {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </h3>
              <span className="badge rounded-pill bg-light text-muted border px-3">
                Tổng số: {data.currentQueue.length}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th scope="col" style={{ width: "95px" }}>Số Thứ Tự</th>
                    <th scope="col">Bệnh Nhân</th>
                    <th scope="col">Gói Xét Nghiệm</th>
                    <th scope="col" style={{ width: "100px" }}>Giờ Đến</th>
                    <th scope="col" style={{ width: "90px" }}>Chờ (phút)</th>
                    <th scope="col" style={{ width: "95px" }}>Ưu Tiên</th>
                    <th scope="col" style={{ width: "105px" }}>Trạng Thái</th>
                    <th scope="col" className="text-end pe-3" style={{ width: "120px" }}>Thao Tác</th>
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
                        <td className="fw-bold font-monospace fs-5" style={{ color: '#648CF4' }}>
                          {ticket.ticketNumber}
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">
                            {(() => {
                              const name = ticket.patientName || '';
                              if (!name || name.startsWith('PAT-') || name.startsWith('USR-') || name.includes('000000')) {
                                return ticket.isWalkIn ? `Khách vãng lai (${ticket.ticketNumber})` : `Bệnh nhân (${ticket.ticketNumber})`;
                              }
                              return name;
                            })()}
                          </div>
                          <div className="small text-muted font-monospace">
                            {ticket.patientCode || ticket.ticketNumber}
                            {ticket.isWalkIn && (
                              <span className="badge rounded-pill bg-info bg-opacity-10 text-primary border border-info ms-1">
                                Vãng lai
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
                        <td className="font-monospace small text-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
                              disabled={!selectedCounter}
                              title={!selectedCounter ? "Vui lòng chọn quầy trước khi cập nhật" : ""}
                              className="btn btn-success btn-sm px-3 py-1 rounded-pill shadow-sm"
                              style={{ backgroundColor: '#A3E687', borderColor: '#A3E687', color: '#1A3311' }}
                            >
                              Vào lấy mẫu
                            </button>
                          ) : ticket.status === "Collecting" ? (
                            <span className="text-muted small">Đang xử lý</span>
                          ) : (
                            <button
                              onClick={() => handleCallNext(ticket)}
                              disabled={!selectedCounter}
                              title={!selectedCounter ? "Vui lòng chọn quầy trước khi gọi" : ""}
                              className="btn btn-sm px-3 py-1 rounded-pill shadow-sm text-white"
                              style={{ backgroundColor: '#648CF4', borderColor: '#648CF4' }}
                            >
                              <FaBullhorn className="me-1" /> Gọi số
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
          <div className="card shadow-sm border-0 rounded-4 mb-4 text-center" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#2B3674' }}>Cấp Số Thứ Tự Mới</h3>
            </div>
            <div className="card-body p-4">
              <div className="text-uppercase text-muted small fw-bold mb-2">
                SỐ TIẾP THEO
              </div>
              <div
                style={{
                  fontSize: "68px",
                  fontWeight: "800",
                  color: "#648CF4",
                  fontFamily: "monospace",
                  lineHeight: 1,
                  letterSpacing: "-2px",
                }}
              >
                {data.nextNumber || "—"}
              </div>
              <div className="small text-muted mt-2">
                Hệ thống tự động phân bổ số thứ tự tại bàn tiếp đón
              </div>
              <button
                onClick={handleIssueTicket}
                disabled={issuing}
                className="btn btn-lg w-100 mt-4 fw-bold shadow-sm rounded-pill"
                style={{ backgroundColor: '#648CF4', borderColor: '#648CF4', color: '#ffffff' }}
              >
                <FaPrint className="me-2" />
                {issuing ? "Đang cấp số..." : (data.nextNumber ? `Cấp STT Vãng Lai (${data.nextNumber})` : "Cấp STT Mới")}
              </button>
            </div>
          </div>

          {/* Queue Stats Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#2B3674' }}>Thống Kê Hàng Đợi</h3>
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Đang chờ lượt</span>
                <span className="fw-bold fs-5 text-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>{data.stats.inQueueNow}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Thời gian chờ TB</span>
                <span className="fw-bold fs-5 font-monospace text-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.stats.avgWaitMinutes} min
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Chờ lâu nhất</span>
                <span className="fw-bold fs-5 font-monospace" style={{ color: '#E7BC4C', fontVariantNumeric: 'tabular-nums' }}>
                  {data.stats.longestWaitMinutes} min
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted small">Đã phục vụ hôm nay</span>
                <span className="fw-bold fs-5 font-monospace text-success" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.stats.servedToday}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="text-muted small">Quầy đang mở</span>
                <span className="fw-bold fs-5" style={{ color: '#648CF4' }}>
                  {data.stats.countersActive}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Counters Card */}
          <div className="card shadow-sm border-0 rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#2B3674' }}>Danh Sách Bàn Tiếp Đón</h3>
            </div>
            <div className="card-body p-3">
              {data.counters.map((c, idx) => (
                <div key={idx} className={`p-2 rounded-3 mb-2 ${c.status === "Active" ? "bg-light" : ""}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark">{c.counterName}</span>
                    <span
                      className={`badge rounded-pill ${
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

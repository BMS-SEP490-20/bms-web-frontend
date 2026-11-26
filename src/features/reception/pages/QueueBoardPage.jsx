import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Printer, Megaphone, Check, Clock, UserCheck, AlertCircle, PlusCircle, Hospital, ShieldCheck, ListOrdered } from 'lucide-react';
import { queueApi } from "../api/queueApi";

export default function QueueBoardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedCounter, setSelectedCounter] = useState("Quầy Tiếp Đón 01");
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

  const [boardError, setBoardError] = useState(null);

  const DEFAULT_RECEPTION_COUNTERS = [
    {
      counterName: "Quầy Tiếp Đón 01",
      staffName: "Lễ tân trực chính",
      status: "Active",
      description: "Tiếp đón lịch hẹn & Cấp số thứ tự",
    },
    {
      counterName: "Quầy Tiếp Đón 02",
      staffName: "Lễ tân thu ngân POS",
      status: "Available",
      description: "Đăng ký khách vãng lai & Thu viện phí",
    },
    {
      counterName: "Phòng Lấy Mẫu 101",
      staffName: "KTV Lấy mẫu tầng 1",
      status: "Available",
      description: "Bàn lấy mẫu xét nghiệm",
    },
  ];

  const loadQueue = useCallback(async () => {
    try {
      setBoardError(null);
      const res = await queueApi.fetchLiveQueue();
      if (res?.data) {
        const boardData = { ...res.data };
        boardData.stats = boardData.stats || {};
        const apiCounters = Array.isArray(boardData.counters) ? boardData.counters : [];
        const mergedCounters = DEFAULT_RECEPTION_COUNTERS.map((def) => {
          const activeMatch = apiCounters.find((c) => c.counterName === def.counterName);
          return activeMatch ? { ...def, ...activeMatch, staffName: activeMatch.staffName || def.staffName } : def;
        });
        apiCounters.forEach((c) => {
          if (c.counterName && !mergedCounters.some((m) => m.counterName === c.counterName)) {
            mergedCounters.push(c);
          }
        });
        boardData.counters = mergedCounters;
        if (!boardData.stats.countersActive || boardData.stats.countersActive === "0") {
          const activeCount = mergedCounters.filter((c) => c.status === "Active" || c.status === "Available").length;
          boardData.stats.countersActive = `${activeCount} / ${mergedCounters.length}`;
        }
        setData(boardData);
      } else {
        setData({ currentQueue: [], counters: DEFAULT_RECEPTION_COUNTERS, stats: {} });
      }
    } catch (err) {
      setBoardError(err?.response?.data?.message || err?.message || 'Không thể tải bảng hàng đợi tiếp đón.');
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
        return <span className="badge bg-danger px-2.5 py-1">STAT (Cấp cứu)</span>;
      case "Urgent":
        return <span className="badge bg-warning text-dark px-2.5 py-1">Ưu tiên khẩn</span>;
      default:
        return <span className="badge bg-secondary bg-opacity-25 text-dark px-2.5 py-1">Thường quy</span>;
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
    <div className="w-100 py-1">
      {/* 1. Master Luxury Page Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill small fw-semibold mb-2 d-inline-flex align-items-center gap-1">
            <Clock size={11} /> QUY TRÌNH TIẾP ĐÓN • BƯỚC 3: ĐIỀU PHỐI &amp; GỌI SỐ HÀNG ĐỢI
          </span>
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">
              Bảng Gọi Số &amp; Điều Phối Hàng Đợi (Realtime)
            </h1>
          </div>
          <p className="text-muted mb-0 small" style={{ maxWidth: '850px' }}>
            Hiển thị số thứ tự đang gọi tại Quầy Tiếp đón và Phòng Lấy mẫu.
          </p>
        </div>
        <div className="bms-page-actions d-flex align-items-center gap-2">
          <div className="d-flex align-items-center">
            <span className="small text-muted me-2 fw-semibold">Quầy phục vụ:</span>
            <select
              className="form-select form-select-sm rounded-pill"
              value={selectedCounter}
              onChange={(e) => setSelectedCounter(e.target.value)}
              style={{ width: "220px", backgroundColor: '#FFFFFF', borderColor: 'rgba(226, 232, 240, 1)' }}
            >
              <option value="">-- Chọn quầy phục vụ --</option>
              {(data.counters || []).map((c, i) => (
                <option key={i} value={c.counterName}>
                  {c.counterName} {c.staffName ? `(${c.staffName})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {boardError && (
        <div className="alert alert-danger alert-dismissible fade show rounded-4 shadow-sm mb-4" role="alert">
          <span>{boardError}</span>
          <button type="button" className="btn btn-sm btn-outline-danger ms-3" onClick={loadQueue}>Thử lại</button>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setBoardError(null)} />
        </div>
      )}
      {actionMessage && (
        <div className={`alert alert-${actionMessage.type || 'success'} alert-dismissible fade show d-flex align-items-center justify-content-between rounded-4 shadow-sm mb-4`} role="alert">
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

      {/* Main Grid: Left Queue Standalone Table, Right Issue Box */}
      <div className="row g-4">
        {/* Left Column: Unified Card Section */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
                <div>
                  <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                    <ListOrdered style={{ color: '#1E60E6' }}  size="1em"/>
                    Hàng Đợi Bệnh Nhân Tiếp Đón — Ngày {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </h5>
                  <div className="text-muted small">
                    Theo dõi trạng thái lượt gọi số và phân bổ vào các phòng lấy mẫu y tế
                  </div>
                </div>

                <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ backgroundColor: 'rgba(30, 96, 230, 0.1)', color: '#1E60E6', fontSize: '12px' }}>
                  Tổng số: {data.currentQueue.length} bệnh nhân
                </span>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead style={{ background: '#F8FAFC' }}>
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
                      <td colSpan="8" className="text-center py-3 text-muted">
                        Hiện không có bệnh nhân nào trong hàng đợi.
                      </td>
                    </tr>
                  ) : (
                    data.currentQueue.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={ticket.status === "Called" ? "table-success" : ""}
                      >
                        <td className="fw-bold font-monospace fs-5" style={{ color: '#1E60E6' }}>
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
                        <td className="text-end pe-3">
                          {ticket.status === "Called" || ticket.status === "Collecting" || ticket.status === "Served" || ticket.status === "Completed" || ticket.status === "Done" ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1.5 rounded-pill fw-semibold">
                              <Check className="me-1"  size="1em"/> Đã gọi số
                            </span>
                          ) : ticket.status === "Waiting" || !ticket.status ? (
                            <button
                              onClick={() => handleCallNext(ticket)}
                              disabled={!selectedCounter}
                              title={!selectedCounter ? "Vui lòng chọn quầy trước khi gọi" : ""}
                              className="btn btn-sm px-3 py-1 rounded-pill shadow-sm text-white"
                              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                            >
                              <Megaphone className="me-1"  size="1em"/> Gọi số
                            </button>
                          ) : (
                            <span className="text-muted small">{ticket.status}</span>
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
      </div>

        {/* Right Column: Issue Ticket & Stats */}
        <div className="col-12 col-xl-4">
          {/* Issue Ticket Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4 text-center" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#0F172A' }}>Cấp Số Thứ Tự Mới</h3>
            </div>
            <div className="card-body p-2">
              <div className="text-uppercase text-muted small fw-bold mb-2">
                SỐ TIẾP THEO
              </div>
              <div
                style={{
                  fontSize: "68px",
                  fontWeight: "800",
                  color: "#1E60E6",
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
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' }}
              >
                <Printer className="me-2"  size="1em"/>
                {issuing ? "Đang cấp số..." : (data.nextNumber ? `Cấp STT Vãng Lai (${data.nextNumber})` : "Cấp STT Mới")}
              </button>
            </div>
          </div>

          {/* Queue Stats Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#0F172A' }}>Thống Kê Hàng Đợi</h3>
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
                <span className="fw-bold fs-5 font-monospace" style={{ color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>
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
                <span className="fw-bold fs-5" style={{ color: '#1E60E6' }}>
                  {data.stats.countersActive}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Counters Card */}
          <div className="card shadow-sm border-0 rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
            <div className="card-header bg-white py-3 border-bottom" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#0F172A' }}>Danh Sách Bàn Tiếp Đón</h3>
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

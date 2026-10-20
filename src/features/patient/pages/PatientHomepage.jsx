/**
 * @file PatientHomepage.jsx
 * @description Patient Portal Homepage interface (UC81 / UCA01 - View Patient Homepage).
 * @issue I1-003 | BR-003 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy
 * Displays recent clinical laboratory results, live timeline activity, and self-service quick actions.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 * @module features/patient-portal/pages/PatientHomepage
 */

import React, { useState, useEffect } from "react";
import "./PatientHomepage.css";
import LoginPage from "../../auth/pages/LoginPage";
import ServicePackagesPage from "../../admin/pages/ServicePackagesPage.jsx";
import ForgotPassword from "../../auth/pages/ForgotPassword";
import api from "../../../config/api";

function Icon({ children }) {
  return <i className={`bi bi-${children}`} aria-hidden="true" />;
}

function ActionButton({ icon, children, primary = false, onClick }) {
  return (
    <button
      type="button"
      className={`ph-button ${primary ? "primary" : ""}`}
      onClick={onClick}
    >
      <Icon>{icon}</Icon>
      {children}
    </button>
  );
}

export default function PatientHomepage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load stored authenticated user if present
    const storedUser = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Ignore parse error
      }
    }

    // Fetch live dashboard metrics from database API
    setLoading(true);
    api.get("/dashboard/stats?role=Patient")
      .then((res) => {
        if (res.data?.success) {
          setDashboardData(res.data.data);
        }
      })
      .catch((err) => {
        console.error("[PatientHomepage] Error fetching dashboard data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function getInitials(fullName) {
    if (!fullName) return "U";
    return fullName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function handleLogout() {
    localStorage.removeItem("bms_access_token");
    localStorage.removeItem("bms_token");
    localStorage.removeItem("bms_refresh_token");
    localStorage.removeItem("bms_user");
    sessionStorage.removeItem("bms_access_token");
    sessionStorage.removeItem("bms_token");
    sessionStorage.removeItem("bms_refresh_token");
    sessionStorage.removeItem("bms_user");
    setUser(null);
  }

  if (showAdmin) {
    return <ServicePackagesPage onBack={() => setShowAdmin(false)} />;
  }

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBackToLogin={() => {
          setShowForgotPassword(false);
          setShowLogin(true);
        }}
        onRegister={() => {
          setShowForgotPassword(false);
          window.location.href = "/register";
        }}
      />
    );
  }

  if (showLogin) {
    return (
      <LoginPage
        onBack={() => setShowLogin(false)}
        onForgotPassword={() => {
          setShowLogin(false);
          setShowForgotPassword(true);
        }}
      />
    );
  }

  const patientName = user?.fullName || dashboardData?.userName || "Quý Khách Hàng";
  const appointments = dashboardData?.patientData?.recentAppointments || [];
  const results = dashboardData?.patientData?.recentResults || [];

  return (
    <div className="patient-home">
      <nav className="ph-nav">
        <div className="ph-brand">
          <span className="ph-mark">
            <img src="/assets/bms-logo.png" alt="BMS Logo" />
          </span>
          <span className="ph-brand-copy">
            BMS CLINICAL LABORATORY
            <small>Cổng Y Tế Chăm Sóc Sức Khỏe Bệnh Nhân</small>
          </span>
        </div>
        <div className="ph-links">
          <a className="active" href="/">Trang Chủ</a>
          <a href="/services">Gói Xét Nghiệm</a>
          <a href="#results">Lịch Sử Xét Nghiệm</a>
          <a href="#appointments">Lịch Sử Thanh Toán</a>
        </div>

        <div className="ph-nav-user">
          {user ? (
            <>
              <div className="ph-user-info">
                <div className="ph-user-avatar">
                  {getInitials(user.fullName)}
                </div>
                <div className="ph-user-text">
                  <span className="ph-user-name">{user.fullName}</span>
                  <span className="ph-user-role">{user.role || "Bệnh Nhân"}</span>
                </div>
              </div>
              <button
                type="button"
                className="ph-logout-button"
                onClick={handleLogout}
                title="Đăng xuất an toàn"
              >
                <Icon>box-arrow-right</Icon>
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="ph-login-button"
              onClick={() => setShowLogin(true)}
            >
              <Icon>box-arrow-in-right</Icon>
              <span>Đăng Nhập Cổng Y Tế</span>
            </button>
          )}
        </div>
      </nav>

      <main className="ph-main" id="home">
        <section className="ph-hero">
          <div className="ph-hero-content">
            <div className="ph-eyebrow">CHÀO MỪNG ĐẾN VỚI HỆ THỐNG BMS</div>
            <h1>Xin chào, {patientName}</h1>
            <p>
              Hệ thống phòng xét nghiệm y khoa tự động hóa chuẩn ISO 15189:2022. Quý khách có thể theo dõi tiến độ xét nghiệm, tải kết quả có chữ ký số bác sĩ hoặc đặt lịch lấy mẫu tại nhà.
            </p>
            <div className="ph-hero-actions">
              <ActionButton
                icon="calendar-plus"
                primary
                onClick={() => { window.location.href = "/services"; }}
              >
                Đặt Lịch Lấy Mẫu
              </ActionButton>
              <ActionButton
                icon="file-earmark-medical"
                onClick={() => { window.location.href = "/profile"; }}
              >
                Xem Hồ Sơ Xét Nghiệm
              </ActionButton>
            </div>
          </div>
          <div className="ph-orb orb-one" />
          <div className="ph-orb orb-two" />
        </section>

        {/* Dynamic KPI Cards from Database */}
        <section className="ph-kpis">
          {dashboardData?.summaryCards?.map((card) => (
            <div className="ph-kpi" key={card.key}>
              <div className="ph-kpi-label">
                {card.title} <Icon>{card.icon || "file-earmark-medical"}</Icon>
              </div>
              <strong className="brand-color">{card.value}</strong>
              <small className="brand-color">{card.subtitle}</small>
            </div>
          )) || (
            <>
              <div className="ph-kpi">
                <div className="ph-kpi-label">Tiêu Chuẩn Phòng Lab <Icon>shield-check</Icon></div>
                <strong className="verified">ISO 15189</strong>
                <small>Chứng nhận Quốc tế</small>
              </div>
              <div className="ph-kpi">
                <div className="ph-kpi-label">Thời Gian Trả Kết Quả <Icon>clock-history</Icon></div>
                <strong className="brand-color">90 - 120 Phút</strong>
                <small>Tối ưu tự động hóa</small>
              </div>
              <div className="ph-kpi">
                <div className="ph-kpi-label">Bác Sĩ Cố Vấn <Icon>person-heart</Icon></div>
                <strong className="brand-color">100% BS.CKI/ThS</strong>
                <small>Tư vấn chuyên sâu</small>
              </div>
              <div className="ph-kpi">
                <div className="ph-kpi-label">Bảo Mật Bệnh Án <Icon>lock</Icon></div>
                <strong className="verified">HIPAA & BYT</strong>
                <small>Mã hóa dữ liệu 256-bit</small>
              </div>
            </>
          )}
        </section>

        <div className="ph-columns">
          <div className="ph-left">
            {/* Lịch Hẹn Gần Nhất */}
            <section className="ph-card" id="appointments">
              <header className="ph-card-head">
                <h2>Lịch Lấy Mẫu & Thăm Khám Sắp Tới</h2>
                <a href="/services">Đặt thêm lịch →</a>
              </header>
              <div className="ph-card-body">
                {appointments.length > 0 ? (
                  appointments.map((apt) => (
                    <div className="ph-appointment" key={apt.id}>
                      <div className="ph-date-icon"><Icon>calendar2-event</Icon></div>
                      <div className="ph-appointment-content">
                        <div className="ph-appointment-title">
                          <div>
                            <h3>{apt.packageName}</h3>
                            <span className="ph-mono">
                              Mã hẹn: {apt.appointmentCode} • BS: {apt.doctorName || "Bác Sĩ Trực Ca"}
                            </span>
                          </div>
                          <span className="ph-pill info">{apt.status || "Đã xác nhận"}</span>
                        </div>
                        <div className="ph-details">
                          <span><Icon>calendar3</Icon><b>{apt.appointmentTime}</b></span>
                          <span className="green"><Icon>shield-check</Icon>Đã lên lịch</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted">
                    <Icon>calendar-x</Icon>
                    <p className="mt-2 mb-0">Hiện tại bạn chưa có lịch hẹn xét nghiệm nào.</p>
                  </div>
                )}
                <div className="ph-alert warning">
                  <Icon>exclamation-triangle-fill</Icon>
                  <div>
                    <b>Lưu ý chuẩn bị trước lấy mẫu máu:</b> Vui lòng nhịn ăn từ 8 - 12 tiếng trước giờ lấy mẫu (chỉ được uống nước lọc). Hạn chế sử dụng rượu bia, chất kích thích hoặc thuốc kháng sinh trước khi lấy mẫu.
                  </div>
                </div>
              </div>
            </section>

            {/* Kết Quả Xét Nghiệm Mới Nhất */}
            <section className="ph-card" id="results">
              <header className="ph-card-head">
                <h2>Kết Quả Xét Nghiệm Mới Nhất</h2>
                <a href="/profile">Xem tất cả hồ sơ →</a>
              </header>
              <div className="ph-table-wrap">
                {results.length > 0 ? (
                  <table className="ph-table">
                    <thead>
                      <tr>
                        <th>Ngày Trả KQ</th>
                        <th>Tên Gói Xét Nghiệm</th>
                        <th>Mã Đơn</th>
                        <th>Trạng Thái</th>
                        <th>Cảnh Báo</th>
                        <th>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, idx) => (
                        <tr key={r.testOrderId || idx}>
                          <td>{r.releasedAt || "Hôm nay"}</td>
                          <td className="strong">{r.packageName}</td>
                          <td className="ph-mono">{r.testOrderId}</td>
                          <td><span className="ph-pill released">{r.status || "Đã duyệt"}</span></td>
                          <td>
                            {r.hasAbnormalFlag ? (
                              <span className="ph-flag">Cần lưu ý</span>
                            ) : (
                              <span className="text-success small fw-semibold">Bình thường</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ph-text-button"
                              onClick={() => { window.location.href = "/profile"; }}
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <p className="mb-0">Chưa có kết quả xét nghiệm mới cần xử lý.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="ph-right">
            <section className="ph-card">
              <header className="ph-card-head"><h2>Quy Trình 4 Bước Chuẩn Y Khoa</h2></header>
              <div className="ph-timeline">
                <div className="ph-timeline-item">
                  <div className="ph-timeline-time">Bước 1</div>
                  <div className="ph-timeline-title">Đăng Ký & Đặt Lịch Trực Tuyến</div>
                  <div className="ph-timeline-desc">Chọn gói xét nghiệm và khung giờ thuận tiện nhất.</div>
                </div>
                <div className="ph-timeline-item">
                  <div className="ph-timeline-time">Bước 2</div>
                  <div className="ph-timeline-title">Lấy Mẫu An Toàn Chuẩn Vô Khuẩn</div>
                  <div className="ph-timeline-desc">Thực hiện bởi Kỹ thuật viên / Điều dưỡng giàu kinh nghiệm.</div>
                </div>
                <div className="ph-timeline-item">
                  <div className="ph-timeline-time">Bước 3</div>
                  <div className="ph-timeline-title">Phân Tích Bằng Hệ Thống Tự Động</div>
                  <div className="ph-timeline-desc">Máy phân tích Sysmex, Roche với kiểm soát IQC chặt chẽ.</div>
                </div>
                <div className="ph-timeline-item">
                  <div className="ph-timeline-time">Bước 4</div>
                  <div className="ph-timeline-title">Nhận Kết Quả Ký Số & Tư Vấn</div>
                  <div className="ph-timeline-desc">Tải bản PDF có chữ ký số hợp chuẩn và tư vấn cùng Bác sĩ.</div>
                </div>
              </div>
            </section>

            <section className="ph-card">
              <header className="ph-card-head"><h2>Dịch Vụ Tiện Ích</h2></header>
              <div className="ph-quick-actions">
                <ActionButton icon="calendar-plus" onClick={() => { window.location.href = "/services"; }}>
                  Đặt Gói Xét Nghiệm
                </ActionButton>
                <ActionButton icon="file-pdf" onClick={() => { window.location.href = "/profile"; }}>
                  Tra Cứu Bệnh Án
                </ActionButton>
                <ActionButton icon="telephone" onClick={() => { window.location.href = "tel:19006868"; }}>
                  Tổng Đài 1900 6868
                </ActionButton>
                <ActionButton icon="shield-check" onClick={() => { window.location.href = "/profile"; }}>
                  Thông Tin Cá Nhân
                </ActionButton>
              </div>
            </section>
          </aside>
        </div>
        <footer className="ph-footer">
          © 2026 BMS Clinical Laboratory — Hệ Thống Xét Nghiệm Y Khoa Chuẩn Quốc Tế ISO 15189:2022
        </footer>
      </main>
    </div>
  );
}

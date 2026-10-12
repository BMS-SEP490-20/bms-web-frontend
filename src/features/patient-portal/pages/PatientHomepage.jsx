import "./PatientHomepage.css";
import React, { useState } from "react";
import "./PatientHomepage.css";
import LoginPage from "../../auth/pages/LoginPage";

const results = [
  { date: "28 Sep", name: "Complete Blood Count", id: "ORD-260927-0231", doctor: "Dr. Trần Thị Bình", flag: "PLT" },
  { date: "14 Jun", name: "Glucose Panel", id: "ORD-260614-0112", doctor: "Dr. Nguyễn Minh Em", flag: "—" },
  { date: "02 Mar", name: "Kidney Function", id: "ORD-260302-0058", doctor: "Dr. Trần Thị Bình", flag: "—" },
];

const activity = [
  ["06 Oct · 11:48", "Appointment confirmed", "Lipid Profile · 10 Oct 08:00"],
  ["06 Oct · 11:46", "Payment received · 250,000 ₫", "VNPay · Txn 20261006-1146-882341"],
  ["28 Sep · 10:12", "CBC results released", "Approved by Dr. Trần Thị Bình"],
  ["27 Sep · 08:05", "Specimen collected", "SPC-260927-A1-0087 · Lab Room 02"],
  ["27 Sep · 07:48", "Checked in via QR", "Queue Q-008 · Wait 4 min"],
];

function Icon({ children }) {
  return <i className={`bi bi-${children}`} aria-hidden="true" />;
}

function ActionButton({ icon, children, primary = false, onClick }) {
  return <button className={`ph-button ${primary ? "primary" : ""}`} onClick={onClick || (() => window.alert(`${children} — demo UI`))}><Icon>{icon}</Icon>{children}</button>;
}


export default function PatientHomepage() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
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
    localStorage.removeItem("bms_refresh_token");
    sessionStorage.removeItem("bms_access_token");
    sessionStorage.removeItem("bms_refresh_token");

    setUser(null);
  }
  async function handleLogin(data) {
    const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usernameOrEmail: data.email,
            password: data.password,
          }),
        }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
          result.message ||
          result.Message ||
          result.title ||
          result.detail ||
          "Đăng nhập thất bại. Vui lòng kiểm tra tài khoản và mật khẩu."
      );
    }

    // Lưu token theo lựa chọn Ghi nhớ đăng nhập
    const storage = data.rememberMe
        ? localStorage
        : sessionStorage;

    storage.setItem("bms_access_token", result.accessToken);
    storage.setItem("bms_refresh_token", result.refreshToken);

    // Lấy thông tin tài khoản thật từ Backend
    setUser(result.user);

    // Đóng trang Login, quay lại Home
    setShowLogin(false);
  }
  if (showLogin) {
    return (
        <LoginPage
            onBack={() => setShowLogin(false)}
            onLogin={handleLogin}
            onRegister={() => {
              console.log("Navigate to Register");
            }}
        />
    );
  }

  return (
    <div className="patient-home">
      <nav className="ph-nav">
        <div className="ph-brand"><span className="ph-mark">BMS</span><span className="ph-brand-copy">BMS Health<small>Patient portal</small></span></div>
        <div className="ph-links">
          <a className="active" href="#home">Home</a><a href="#services">Services</a><a href="#appointments">Appointments</a><a href="#results">Results</a><a href="#payments">Payments</a><a href="#messages">Messages</a>
        </div>

        <div className="ph-nav-user">
          {user ? (
              <>
                <div className="ph-user-info">
                  <div className="ph-user-avatar">
                    {getInitials(user.fullName)}
                  </div>

                  <div className="ph-user-text">
          <span className="ph-user-name">
            {user.fullName}
          </span>
                    <span className="ph-user-role">
            {user.role || "Patient"}
          </span>
                  </div>
                </div>

                <button
                    type="button"
                    className="ph-logout-button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                >
                  <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  <span>Đăng xuất</span>
                </button>
              </>
          ) : (
              <button
                  type="button"
                  className="ph-login-button"
                  onClick={() => setShowLogin(true)}
              >
                <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                <span>Đăng nhập</span>
              </button>
          )}
        </div>
      </nav>

      <main className="ph-main" id="home">
        <section className="ph-hero">
          <div className="ph-hero-content">
            <div className="ph-eyebrow">WELCOME BACK</div>
            <h1>
              Good morning, {user?.fullName || "Nguyễn Văn An"}
            </h1>

            {user && (
                <p>
                  {user.username} · {user.role}
                </p>
            )}
            <p>Your follow-up Lipid Profile is scheduled in <b>3 days</b>. Remember to fast 12 hours before collection. We also have <b>1 new result</b> ready for your review.</p>
            <div className="ph-hero-actions"><ActionButton icon="calendar-plus" primary>Book appointment</ActionButton><ActionButton icon="file-earmark-medical">View results</ActionButton></div>
          </div>
          <div className="ph-orb orb-one" /><div className="ph-orb orb-two" />
        </section>

        <section className="ph-kpis">
          <div className="ph-kpi"><div className="ph-kpi-label">Upcoming appointments <Icon>calendar2-check</Icon></div><strong>2</strong><small className="up"><Icon>arrow-up-right</Icon> Next: 10 Oct, 08:00</small></div>
          <div className="ph-kpi"><div className="ph-kpi-label">New results <Icon>file-earmark-medical</Icon></div><strong className="brand-color">1</strong><small className="brand-color"><Icon>circle-fill</Icon> CBC — awaiting review</small></div>
          <div className="ph-kpi"><div className="ph-kpi-label">Tests completed <Icon>check-circle</Icon></div><strong>8</strong><small className="up"><Icon>arrow-up-right</Icon> +2 this quarter</small></div>
          <div className="ph-kpi"><div className="ph-kpi-label">Account status <Icon>shield-check</Icon></div><strong className="verified">Verified</strong><small>Since Jan 2026</small></div>
        </section>

        <div className="ph-columns">
          <div className="ph-left">
            <section className="ph-card" id="appointments">
              <header className="ph-card-head"><h2>Next appointment</h2><a href="#appointments">View all →</a></header>
              <div className="ph-card-body">
                <div className="ph-appointment">
                  <div className="ph-date-icon"><Icon>calendar2-event</Icon></div>
                  <div className="ph-appointment-content">
                    <div className="ph-appointment-title"><div><h3>Lipid Profile — Standard</h3><span className="ph-mono">ORD-261010-0342 · Dr. Trần Thị Bình · Lab Room 02</span></div><span className="ph-pill info">Confirmed</span></div>
                    <div className="ph-details"><span><Icon>calendar3</Icon><b>10 Oct 2026</b></span><span><Icon>clock</Icon><b>08:00</b></span><span className="green"><Icon>wallet2</Icon>Paid · 250,000 ₫</span></div>
                  </div>
                </div>
                <div className="ph-alert warning"><Icon>exclamation-triangle-fill</Icon><div><b>Fasting required.</b> Do not eat or drink anything except water for 12 hours before your collection time. Last meal: no later than 20:00 on 09 Oct.</div></div>
                <div className="ph-button-row"><ActionButton icon="qr-code">Check-in QR</ActionButton><ActionButton icon="pencil">Reschedule</ActionButton><ActionButton icon="calendar-plus">Add to calendar</ActionButton><ActionButton icon="printer">Print confirmation</ActionButton></div>
              </div>
            </section>

            <section className="ph-card" id="results">
              <header className="ph-card-head"><h2>Latest results</h2><a href="#results">View all →</a></header>
              <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Date</th><th>Package</th><th>Order</th><th>Doctor</th><th>Status</th><th>Flags</th><th /></tr></thead>
                <tbody>{results.map((r) => <tr key={r.id}><td>{r.date}</td><td className="strong">{r.name}</td><td className="ph-mono">{r.id}</td><td>{r.doctor}</td><td><span className="ph-pill released">Released</span></td><td>{r.flag === "PLT" ? <><span className="ph-flag">L</span> PLT</> : r.flag}</td><td><button className="ph-text-button" onClick={() => window.alert(`Opening ${r.name} — demo UI`)}>View</button></td></tr>)}</tbody>
              </table></div>
            </section>
          </div>

          <aside className="ph-right">
            <section className="ph-card">
              <header className="ph-card-head"><h2>Activity</h2></header>
              <div className="ph-timeline">{activity.map(([time, title, desc]) => <div className="ph-timeline-item" key={time}><div className="ph-timeline-time">{time}</div><div className="ph-timeline-title">{title}</div><div className="ph-timeline-desc">{desc}</div></div>)}</div>
            </section>
            <section className="ph-card">
              <header className="ph-card-head"><h2>Quick actions</h2></header>
              <div className="ph-quick-actions">
                <ActionButton icon="calendar-plus">Book test</ActionButton><ActionButton icon="file-pdf">Download report</ActionButton><ActionButton icon="wallet2">Payment history</ActionButton><ActionButton icon="person">Edit profile</ActionButton><ActionButton icon="chat-dots">Leave feedback</ActionButton><ActionButton icon="question-circle">Help centre</ActionButton>
              </div>
            </section>
            <div className="ph-alert info-alert"><Icon>info-circle</Icon><div><b>Profile 92% complete.</b> Add an emergency contact to finish. <a href="#profile">Complete now →</a></div></div>
          </aside>
        </div>
        <footer className="ph-footer">© 2026 BMS Health · Patient portal</footer>
      </main>
    </div>
  );
}

/**
 * @file GlobalIotAlertPopup.jsx
 * @description Global floating bottom-right IoT Alert Popup for Cold-Chain Monitoring.
 * Automatically pops up in the bottom-right corner on ANY page of the application whenever:
 * 1. Connection between Backend and IoT sensor is lost.
 * 2. Live temperature or humidity violates configured safe thresholds.
 * 3. Connection is restored and offline buffered readings are synced back to Database.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaExclamationTriangle,
  FaVolumeUp,
  FaVolumeMute,
  FaChevronDown,
  FaChevronUp,
  FaDatabase,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa';
import { fetchIotConnectionStatus } from '../api/iotTelemetryApi';
import { ROLES, hasRole, getStoredUser } from '../../../constants/roles';

function formatDateTimeVi(isoString) {
  if (!isoString) return 'Chưa ghi nhận';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDurationVi(seconds) {
  if (seconds == null || seconds < 0) return '0 giây';
  const s = Math.round(Number(seconds));
  if (s < 60) return `${s} giây`;
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  if (mins < 60) return `${mins} phút ${remSec}s`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return `${hours} giờ ${remMin} phút`;
}

function playPopupAlarmBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context autoplay restrictions until user interacts
  }
}

export default function GlobalIotAlertPopup() {
  const location = useLocation();
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [dismissedViolationKey, setDismissedViolationKey] = useState('');

  const wasDisconnectedRef = useRef(false);
  const inFlightRef = useRef(false);

  // Security & Medical SaaS UX: IoT Cold-Chain Alert is strictly internal to Admin and Manager (ROLE-PERMISSION-MATRIX §1).
  // It MUST ONLY be displayed inside internal management/lab routes, NEVER on public marketing or patient-facing pages!
  const currentUser = getStoredUser();
  const isRoleAuthorized = hasRole(currentUser, ROLES.ADMIN, ROLES.MANAGER);

  const isInternalPortal =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/manager') ||
    location.pathname.startsWith('/lab') ||
    location.pathname.startsWith('/iot') ||
    location.pathname.startsWith('/dashboard');

  const isAuthorized = isRoleAuthorized && isInternalPortal;

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password';

  const checkIotStatus = useCallback(async () => {
    if (!isAuthorized) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await fetchIotConnectionStatus('BMS-IOT-001');
      if (!data) return;

      const isNowConnected = Boolean(data.isConnected);

      if (wasDisconnectedRef.current && isNowConnected) {
        wasDisconnectedRef.current = false;
        setShowRecoveryBanner(true);
        setMinimized(false);
        setTimeout(() => {
          setShowRecoveryBanner(false);
        }, 9000);
      } else if (!isNowConnected) {
        if (!wasDisconnectedRef.current) {
          wasDisconnectedRef.current = true;
          setMinimized(false);
          if (soundEnabled) {
            playPopupAlarmBeep();
          }
        }
      }

      setStatusData(data);
    } catch {
      // Keep last known state on transient network error
    } finally {
      inFlightRef.current = false;
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!isAuthorized) return;
    checkIotStatus();
    const timer = setInterval(checkIotStatus, 5000);

    const handleInstantRefresh = () => {
      setDismissedViolationKey('');
      setMinimized(false);
      checkIotStatus();
    };
    window.addEventListener('bms-iot-status-changed', handleInstantRefresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener('bms-iot-status-changed', handleInstantRefresh);
    };
  }, [checkIotStatus, isAuthorized]);

  if (!isAuthorized || isAuthPage || !statusData) {
    return null;
  }

  const isDisconnected = !statusData.isConnected;
  const isThresholdViolation =
    statusData.isConnected &&
    statusData.latestStatus &&
    statusData.latestStatus !== 'Normal';

  const violationKey = `${statusData.deviceId}-${statusData.latestStatus}-${statusData.latestTemperature}`;
  const isViolationVisible = isThresholdViolation && dismissedViolationKey !== violationKey;

  if (!isDisconnected && !isViolationVisible && !showRecoveryBanner) {
    return null;
  }

  // 1. Minimized Floating Pill in Bottom-Right
  if (minimized && (isDisconnected || isViolationVisible)) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '22px',
          right: '22px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: '999px',
          background: isDisconnected
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#ffffff',
          boxShadow: '0 10px 28px rgba(220, 38, 38, 0.38)',
          cursor: 'pointer',
          border: '2px solid #fecaca',
          fontWeight: 700,
          fontSize: '13px'
        }}
        onClick={() => setMinimized(false)}
        title="Nhấn để mở rộng cảnh báo cảm biến"
      >
        <FaExclamationTriangle size={15} />
        <span>
          {isDisconnected
            ? `Mất kết nối cảm biến (${statusData.deviceId}) · ${formatDurationVi(
                statusData.currentOutageSeconds || statusData.secondsSinceLastSeen
              )}`
            : `Cảnh báo nhiệt độ/độ ẩm: ${Number(statusData.latestTemperature ?? 0).toFixed(1)}°C / ${Number(
                statusData.latestHumidity ?? 0
              ).toFixed(1)}%`}
        </span>
        <FaChevronUp size={13} />
      </div>
    );
  }

  // 2. Reconnection & Buffer Sync Success Popup in Bottom-Right
  if (showRecoveryBanner && statusData.isConnected) {
    const recovered = statusData.lastRecoveredOutage;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '410px',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 9999,
          background: '#ffffff',
          borderRadius: '16px',
          border: '2px solid #7c3aed',
          boxShadow: '0 18px 42px rgba(109, 40, 217, 0.24)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
            <FaCheckCircle size={16} color="#4ade80" />
            <span>Đã khôi phục kết nối cảm biến ({statusData.deviceId})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRecoveryBanner(false)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 16px', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#5b21b6', fontWeight: 700 }}>
            <FaDatabase size={14} />
            <span>
              Đã đồng bộ bù {recovered?.bufferedRecordsSynced ?? 0} bản ghi lưu trữ trong lúc mất kết nối!
            </span>
          </div>
          {recovered && (
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Khoảng gián đoạn: <strong>{formatDateTimeVi(recovered.disconnectedAt)}</strong> →{' '}
              <strong>{formatDateTimeVi(recovered.reconnectedAt)}</strong> (
              {formatDurationVi(recovered.durationSeconds)}).
            </div>
          )}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowRecoveryBanner(false);
                navigate('/iot/monitor');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: '#6d28d9',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Xem biểu đồ</span>
              <FaExternalLinkAlt size={11} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Expanded Bottom-Right Popup (Disconnection OR Threshold Violation)
  const outageSeconds = statusData.currentOutageSeconds || statusData.secondsSinceLastSeen || 0;
  const cleanAlertMessage = (statusData.alertMessage || '').replace(/^MSG-[A-Z]+-\d+:\s*/i, '');

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 9999,
        background: '#ffffff',
        borderRadius: '16px',
        border: isDisconnected ? '2px solid #dc2626' : '2px solid #d97706',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.28)',
        overflow: 'hidden'
      }}
    >
      {/* Popup Header */}
      <div
        style={{
          background: isDisconnected
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
          color: '#ffffff',
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <FaExclamationTriangle size={17} />
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 800, opacity: 0.9, letterSpacing: '0.4px' }}>
              HỆ THỐNG GIÁM SÁT BẢO QUẢN LẠNH
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>
              {isDisconnected
                ? 'Mất kết nối thiết bị cảm biến!'
                : 'Cảnh báo vượt ngưỡng nhiệt độ / độ ẩm!'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <FaVolumeUp size={13} /> : <FaVolumeMute size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Thu gọn xuống góc phải"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FaChevronDown size={13} />
          </button>

          {!isDisconnected && (
            <button
              type="button"
              onClick={() => setDismissedViolationKey(violationKey)}
              title="Đóng thông báo"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <FaTimes size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Popup Body */}
      <div style={{ padding: '15px 16px', fontSize: '12.5px', color: '#1e293b' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 11px',
            borderRadius: '10px',
            background: isDisconnected ? '#fef2f2' : '#fffbeb',
            border: isDisconnected ? '1px solid #fecaca' : '1px solid #fde68a',
            marginBottom: '10px'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>
              {statusData.deviceId} — {statusData.location || 'Kho bảo quản máu'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Tín hiệu cuối: <strong>{formatDateTimeVi(statusData.lastSeenAt)}</strong>
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
              fontWeight: 800,
              fontSize: '12.5px',
              color: isDisconnected ? '#dc2626' : '#b45309'
            }}
          >
            {isDisconnected ? (
              <span>Gián đoạn: {formatDurationVi(outageSeconds)}</span>
            ) : (
              <span>
                {Number(statusData.latestTemperature ?? 0).toFixed(1)}°C ·{' '}
                {Number(statusData.latestHumidity ?? 0).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {isDisconnected ? (
          <>
            <p style={{ margin: '0 0 8px 0', color: '#991b1b', fontWeight: 600, lineHeight: 1.45 }}>
              {cleanAlertMessage ||
                'Mất kết nối đến thiết bị cảm biến môi trường. Không thể nhận dữ liệu thời gian thực!'}
            </p>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                color: '#5b21b6',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '7px'
              }}
            >
              <FaDatabase size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>
                Thiết bị đang tự động lưu trữ nhiệt độ &amp; độ ẩm vào bộ nhớ tạm và sẽ đồng bộ lại ngay khi kết nối
                được khôi phục.
              </span>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: '#92400e', fontWeight: 600, lineHeight: 1.45 }}>
            Chỉ số môi trường kho bảo quản đang nằm ngoài ngưỡng an toàn. Vui lòng kiểm tra tủ bảo quản!
          </p>
        )}

        {/* Popup Footer Actions */}
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {isDisconnected ? 'Tự động ẩn khi kết nối lại' : 'Đang theo dõi trực tuyến'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {location.pathname !== '/iot/monitor' && (
              <button
                type="button"
                onClick={() => navigate('/iot/monitor')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1e40af',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>Xem Biểu Đồ Giám Sát</span>
                <FaExternalLinkAlt size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @file GlobalIotAlertPopup.jsx
 * @description Global floating bottom-right Multi-Device IoT Cold-Chain Alert Popup.
 * Monitors ALL configured refrigerators simultaneously via SignalR (`/hubs/iot`) with safety fallback sync
 * (`GET /api/iot/status/all` & `GET /api/iot/alerts`), so incidents on secondary devices are NEVER missed.
 * Conforms to ISO 15189 CAPA visibility: keeps recovered-but-unclosed CAPA alerts visible until signed off.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Database as LucideDatabase,
  ExternalLink,
  CheckCircle2,
  Radio,
  Thermometer,
  WifiOff,
  X
} from 'lucide-react';
import { fetchAllIotConnectionStatuses, setSelectedIotDeviceId } from '../api/iotTelemetryApi';
import { fetchAlerts } from '../api/iotAlertApi';
import { subscribeIotRealtime } from '../services/iotSignalRClient';
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
    // Ignore autoplay restriction until user interacts
  }
}

export default function GlobalIotAlertPopup() {
  const location = useLocation();
  const navigate = useNavigate();

  const [deviceStatuses, setDeviceStatuses] = useState([]);
  const [openAlerts, setOpenAlerts] = useState([]);
  const [signalRConnected, setSignalRConnected] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState(null);

  const prevDisconnectedSetRef = useRef(new Set());
  const inFlightRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const currentUser = getStoredUser();
  const isRoleAuthorized = hasRole(currentUser, ROLES.MANAGER, ROLES.LAB, ROLES.ADMIN);

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/';

  // Keep live cold-chain monitoring active across ALL staff routes (including /reports, /invoices, /qc, /inventory, /patients...)
  const isAuthorized = isRoleAuthorized && !isAuthPage;

  const syncAllDevicesAndAlerts = useCallback(async () => {
    if (!isAuthorized) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [statusesRes, alertsRes] = await Promise.allSettled([
        fetchAllIotConnectionStatuses(),
        fetchAlerts({ status: 'All' })
      ]);

      if (statusesRes.status === 'fulfilled' && Array.isArray(statusesRes.value)) {
        const list = statusesRes.value;
        const nextDisconnected = new Set();
        let newlyRecovered = null;
        let newlyDisconnected = false;

        for (const st of list) {
          const id = st.deviceId;
          if (!st.isConnected) {
            nextDisconnected.add(id);
            if (!prevDisconnectedSetRef.current.has(id)) {
              newlyDisconnected = true;
            }
          } else if (prevDisconnectedSetRef.current.has(id)) {
            newlyRecovered = st;
          }
        }

        prevDisconnectedSetRef.current = nextDisconnected;

        if (newlyRecovered) {
          setRecoveryNotice(newlyRecovered);
          setTimeout(() => setRecoveryNotice(null), 9000);
        }
        if (newlyDisconnected && soundEnabledRef.current) {
          playPopupAlarmBeep();
        }
        setDeviceStatuses(list);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        const pending = alertsRes.value.filter((a) => a.status !== 'Resolved');
        setOpenAlerts(pending);
      }
    } catch {
      // Retain last known state on transient failure
    } finally {
      inFlightRef.current = false;
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;

    syncAllDevicesAndAlerts();

    // Real-time SignalR subscription across ALL devices
    const unsubscribe = subscribeIotRealtime({
      onConnectionStateChange: (connected) => setSignalRConnected(connected),
      onDeviceStatusUpdated: (updatedStatus) => {
        if (!updatedStatus?.deviceId) return;
        setDeviceStatuses((prev) => {
          const idx = prev.findIndex((d) => d.deviceId === updatedStatus.deviceId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updatedStatus;
            return copy;
          }
          return [...prev, updatedStatus];
        });
        if (!updatedStatus.isConnected && soundEnabledRef.current) {
          playPopupAlarmBeep();
        }
      },
      onAlertUpdated: (payload) => {
        const alert = payload?.alert;
        if (!alert?.id) return;
        setOpenAlerts((prev) => {
          const filtered = prev.filter((a) => a.id !== alert.id);
          if (alert.status === 'Resolved') {
            return filtered;
          }
          return [alert, ...filtered];
        });
        if (payload?.eventType === 'Triggered' && soundEnabledRef.current) {
          playPopupAlarmBeep();
        }
      }
    });

    // Fallback poll (20s) only to recover from missed frames if SignalR disconnects
    const fallbackTimer = setInterval(syncAllDevicesAndAlerts, 20000);

    const handleInstantRefresh = () => {
      syncAllDevicesAndAlerts();
    };
    window.addEventListener('bms-iot-status-changed', handleInstantRefresh);
    window.addEventListener('bms-iot-device-changed', handleInstantRefresh);

    return () => {
      unsubscribe();
      clearInterval(fallbackTimer);
      window.removeEventListener('bms-iot-status-changed', handleInstantRefresh);
      window.removeEventListener('bms-iot-device-changed', handleInstantRefresh);
    };
  }, [isAuthorized, syncAllDevicesAndAlerts]);

  const disconnectedDevices = useMemo(
    () => deviceStatuses.filter((d) => !d.isConnected),
    [deviceStatuses]
  );

  const violatingDevices = useMemo(
    () =>
      deviceStatuses.filter(
        (d) => d.isConnected && d.latestStatus && d.latestStatus !== 'Normal'
      ),
    [deviceStatuses]
  );

  const activeAlertsCount = openAlerts.filter((a) => a.status === 'Active').length;
  const pendingCapaCount = openAlerts.length;
  const hasCriticalIncident =
    disconnectedDevices.length > 0 ||
    violatingDevices.length > 0 ||
    pendingCapaCount > 0;

  if (!isAuthorized || isAuthPage) {
    return null;
  }

  if (!hasCriticalIncident && !recoveryNotice) {
    return null;
  }

  // 1. Reconnection banner if everything else is healthy
  if (recoveryNotice && !hasCriticalIncident) {
    const recovered = recoveryNotice.lastRecoveredOutage;
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
          border: '1px solid #bbf7d0',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            borderBottom: '1px solid #bbf7d0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Đã khôi phục kết nối ({recoveryNotice.deviceId})</span>
          </div>
          <button
            type="button"
            onClick={() => setRecoveryNotice(null)}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '14px 16px', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#047857', fontWeight: 600 }}>
            <LucideDatabase size={14} />
            <span>Đã đồng bộ bù {recovered?.bufferedRecordsSynced ?? 0} bản ghi lưu trữ trong lúc mất kết nối.</span>
          </div>
          {recovered && (
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Gián đoạn: <strong>{formatDateTimeVi(recovered.disconnectedAt)}</strong> ({formatDurationVi(recovered.durationSeconds)}).
            </div>
          )}
        </div>
      </div>
    );
  }

  const isSevere = disconnectedDevices.length > 0 || activeAlertsCount > 0;

  // Build concise multi-device pill summary
  const summaryParts = [];
  if (disconnectedDevices.length > 0) {
    summaryParts.push(
      disconnectedDevices.length === 1
        ? `Mất kết nối (${disconnectedDevices[0].deviceId})`
        : `${disconnectedDevices.length} thiết bị mất kết nối`
    );
  }
  if (pendingCapaCount > 0) {
    summaryParts.push(`${pendingCapaCount} cảnh báo chờ CAPA`);
  } else if (violatingDevices.length > 0) {
    summaryParts.push(`${violatingDevices.length} tủ vượt ngưỡng`);
  }

  // 2. Minimized Bottom-Right Multi-Device Pill
  if (minimized) {
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
          background: isSevere ? '#fef2f2' : '#fffbeb',
          color: isSevere ? '#991b1b' : '#92400e',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
          cursor: 'pointer',
          border: isSevere ? '1px solid #fecaca' : '1px solid #fde68a',
          fontWeight: 700,
          fontSize: '13px'
        }}
        onClick={() => setMinimized(false)}
        title="Nhấn để xem chi tiết toàn bộ tủ lạnh & cảnh báo IoT"
      >
        <AlertTriangle size={15} />
        <span>{summaryParts.join(' · ')}</span>
        {signalRConnected && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '10.5px',
              padding: '2px 6px',
              borderRadius: '999px',
              background: '#dcfce7',
              color: '#166534'
            }}
            title="Đang nhận cảnh báo thời gian thực qua SignalR"
          >
            <Radio size={10} /> LIVE
          </span>
        )}
        <ChevronUp size={13} />
      </div>
    );
  }

  // 3. Expanded Multi-Device Monitoring Card
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '430px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        background: '#ffffff',
        borderRadius: '16px',
        border: isSevere ? '1px solid #fecaca' : '1px solid #fde68a',
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.16)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isSevere ? '#fef2f2' : '#fffbeb',
          color: isSevere ? '#991b1b' : '#92400e',
          borderBottom: isSevere ? '1px solid #fecaca' : '1px solid #fde68a',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <AlertTriangle size={17} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.85, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Giám sát đa thiết bị ({deviceStatuses.length} tủ)</span>
              <span>•</span>
              <span style={{ color: signalRConnected ? '#15803d' : '#64748b' }}>
                {signalRConnected ? 'SignalR Realtime' : 'Polling dự phòng'}
              </span>
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800 }}>
              {summaryParts.join(' · ')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)',
              color: isSevere ? '#991b1b' : '#92400e',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Thu gọn xuống góc phải"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)',
              color: isSevere ? '#991b1b' : '#92400e',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable Multi-Device & Open CAPA Alert List */}
      <div style={{ padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
        {openAlerts.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
              Cảnh báo vượt ngưỡng chưa đóng CAPA ({openAlerts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {openAlerts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: '10px',
                    background: a.temperatureRecovered ? '#f0fdf4' : '#fef2f2',
                    border: a.temperatureRecovered ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Thermometer size={13} color={a.temperatureRecovered ? '#15803d' : '#dc2626'} />
                      <span>{a.deviceId}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>({a.location})</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '2px' }}>
                      Đo được: <strong style={{ color: '#dc2626' }}>{a.observedValue}{a.unit}</strong> (Chuẩn: {a.lowAlert}–{a.highAlert}{a.unit})
                    </div>
                    {a.temperatureRecovered && (
                      <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                        ✓ Cảm biến đã về ngưỡng an toàn · Chờ đánh giá mẫu máu &amp; ký CAPA
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMinimized(true);
                      navigate('/iot/alerts');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: 'none',
                      background: '#1E60E6',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Xử lý
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {disconnectedDevices.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
              Thiết bị mất kết nối ({disconnectedDevices.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {disconnectedDevices.map((d) => (
                <div
                  key={d.deviceId}
                  style={{
                    padding: '9px 11px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <WifiOff size={13} />
                      <span>{d.deviceId}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>— {d.location}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      Gián đoạn: <strong>{formatDurationVi(d.currentOutageSeconds || d.secondsSinceLastSeen)}</strong>
                      {d.lastSeenAt ? ` · Cuối: ${formatDateTimeVi(d.lastSeenAt)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIotDeviceId(d.deviceId);
                      setMinimized(true);
                      navigate('/iot/monitor');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#1e40af',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Kiểm tra
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMinimized(true);
            navigate('/iot/monitor');
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Bảng giám sát IoT
        </button>
        <button
          type="button"
          onClick={() => {
            setMinimized(true);
            navigate('/iot/alerts');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            border: 'none',
            background: '#1E60E6',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>Mở Trung Tâm Cảnh Báo</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}

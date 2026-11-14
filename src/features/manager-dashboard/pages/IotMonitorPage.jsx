import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaThermometerHalf as Thermometer,
  FaTint as Droplets,
  FaWifi as Wifi,
  FaExclamationCircle as WifiOff,
  FaExclamationTriangle as AlertTriangle,
  FaSync as RefreshCw,
  FaDownload as Download,
  FaSlidersH as Sliders,
  FaSearch as Search,
  FaDatabase as Database,
  FaHeartbeat as Activity,
  FaEye as Eye,
  FaHistory as History
} from 'react-icons/fa';
import IotNavigationTabs from '../../iot/components/IotNavigationTabs';
import {
  getIotMonitorDashboard,
  fetchIotDevices,
  getSelectedIotDeviceId,
  setSelectedIotDeviceId,
  createIotDevice,
  fetchIotMqttConfig,
  updateIotMqttConfig
} from '../../iot/api/iotTelemetryApi';

const TIMEFRAME_OPTIONS = [
  { id: '1h', label: '1 giờ qua', hours: 1 },
  { id: '6h', label: '6 giờ qua', hours: 6 },
  { id: '24h', label: '24 giờ qua', hours: 24 },
  { id: '7d', label: '7 ngày qua', hours: 168 },
  { id: 'all', label: 'Tất cả lịch sử', hours: null }
];

function formatDateTimeVi(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTimeShort(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

function TelemetryTimeSeriesChart({
  title,
  subtitle,
  unit,
  dataPoints,
  valueKey,
  minThreshold,
  maxThreshold,
  outages,
  primaryColor,
  safeBandColor,
  icon: Icon,
  selectedOutageId
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 880;
  const height = 250;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const validPoints = useMemo(() => {
    return (dataPoints || []).filter(
      (pt) => pt && pt[valueKey] !== null && pt[valueKey] !== undefined && !Number.isNaN(Number(pt[valueKey]))
    );
  }, [dataPoints, valueKey]);

  if (validPoints.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {Icon && <Icon size={18} color={primaryColor} />}
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        </div>
        <div style={{ padding: '44px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          Chưa có dữ liệu ghi nhận trong khoảng thời gian đã chọn.
        </div>
      </div>
    );
  }

  const values = validPoints.map((d) => Number(d[valueKey]));
  const rawMin = Math.min(...values, Number(minThreshold ?? values[0]) - 1.5);
  const rawMax = Math.max(...values, Number(maxThreshold ?? values[0]) + 1.5);
  const yMin = Math.floor(rawMin * 10) / 10;
  const yMax = Math.ceil(rawMax * 10) / 10 || yMin + 10;
  const yRange = Math.max(yMax - yMin, 1);

  const times = validPoints.map((d) => new Date(d.recordedAt).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = Math.max(maxTime - minTime, 1000);

  const getX = (iso, idx) => {
    if (validPoints.length === 1) return padLeft + plotW / 2;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t) && maxTime > minTime) {
      return padLeft + ((t - minTime) / timeSpan) * plotW;
    }
    return padLeft + (idx / (validPoints.length - 1)) * plotW;
  };

  const getY = (val) => {
    const clamped = Math.max(yMin, Math.min(yMax, Number(val)));
    return padTop + plotH - ((clamped - yMin) / yRange) * plotH;
  };

  const yMaxThreshold = maxThreshold != null ? getY(maxThreshold) : null;
  const yMinThreshold = minThreshold != null ? getY(minThreshold) : null;

  const coords = validPoints.map((pt, idx) => ({
    x: getX(pt.recordedAt, idx),
    y: getY(pt[valueKey]),
    raw: pt,
    idx
  }));

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = `${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} ${polylinePoints} ${coords[
    coords.length - 1
  ].x.toFixed(1)},${(padTop + plotH).toFixed(1)}`;

  const outageBands = (outages || [])
    .map((o) => {
      const startMs = new Date(o.disconnectedAt).getTime();
      const endMs = o.reconnectedAt ? new Date(o.reconnectedAt).getTime() : maxTime;
      if (Number.isNaN(startMs) || endMs < minTime || startMs > maxTime) return null;
      const clampedStart = Math.max(minTime, startMs);
      const clampedEnd = Math.min(maxTime, Math.max(clampedStart, endMs));
      const x1 = padLeft + ((clampedStart - minTime) / timeSpan) * plotW;
      const x2 = padLeft + ((clampedEnd - minTime) / timeSpan) * plotW;
      return {
        id: o.id,
        x: Math.min(x1, x2),
        w: Math.max(Math.abs(x2 - x1), 8),
        isOngoing: o.status === 'Ongoing',
        bufferedCount: o.bufferedRecordsSynced || 0,
        disconnectedAt: o.disconnectedAt,
        reconnectedAt: o.reconnectedAt,
        isSelected: selectedOutageId && selectedOutageId === o.id
      };
    })
    .filter(Boolean);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const val = yMin + r * yRange;
    return { val: val.toFixed(1), y: getY(val) };
  });

  const hovered = hoverIndex != null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icon && <Icon size={18} color={primaryColor} />}
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>
        </div>

        {/* Chart Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: primaryColor, display: 'inline-block' }} />
            Trực tuyến ({unit})
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', transform: 'rotate(45deg)', background: '#7c3aed', display: 'inline-block' }} />
            Đồng bộ sau khi mất kết nối
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            Vượt ngưỡng
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '12px',
                height: '10px',
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px dashed #ef4444',
                display: 'inline-block'
              }}
            />
            Khoảng mất kết nối
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '240px', overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={t.y}
              x2={padLeft + plotW}
              y2={t.y}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={t.y + 4}
              textAnchor="end"
              fontSize="10.5"
              fill="#64748b"
              fontFamily="monospace"
            >
              {t.val}
              {unit}
            </text>
          </g>
        ))}

        {/* Safe Zone Band */}
        {yMaxThreshold != null && yMinThreshold != null && (
          <rect
            x={padLeft}
            y={Math.min(yMaxThreshold, yMinThreshold)}
            width={plotW}
            height={Math.abs(yMinThreshold - yMaxThreshold)}
            fill={safeBandColor || 'rgba(16, 185, 129, 0.08)'}
          />
        )}

        {/* Disconnection Outage Shaded Vertical Windows */}
        {outageBands.map((b, idx) => (
          <g key={b.id || idx}>
            <rect
              x={b.x}
              y={padTop}
              width={b.w}
              height={plotH}
              fill={b.isSelected ? 'rgba(220, 38, 38, 0.24)' : 'rgba(239, 68, 68, 0.13)'}
              stroke="#ef4444"
              strokeWidth={b.isSelected ? '1.5' : '1'}
              strokeDasharray="3 3"
            />
            <text
              x={b.x + b.w / 2}
              y={padTop + 13}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#b91c1c"
            >
              {b.isOngoing ? 'Mất kết nối' : `Mất kết nối (${b.bufferedCount} mẫu)`}
            </text>
          </g>
        ))}

        {/* Upper & Lower Threshold Dashed Lines */}
        {yMaxThreshold != null && (
          <g>
            <line
              x1={padLeft}
              y1={yMaxThreshold}
              x2={padLeft + plotW}
              y2={yMaxThreshold}
              stroke="#dc2626"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <text
              x={padLeft + plotW - 4}
              y={yMaxThreshold - 5}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill="#dc2626"
            >
              Tối đa: {maxThreshold}
              {unit}
            </text>
          </g>
        )}

        {yMinThreshold != null && (
          <g>
            <line
              x1={padLeft}
              y1={yMinThreshold}
              x2={padLeft + plotW}
              y2={yMinThreshold}
              stroke="#2563eb"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <text
              x={padLeft + plotW - 4}
              y={yMinThreshold + 12}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill="#2563eb"
            >
              Tối thiểu: {minThreshold}
              {unit}
            </text>
          </g>
        )}

        {/* Area under curve */}
        <polygon points={areaPoints} fill={primaryColor} fillOpacity="0.07" />

        {/* Main Telemetry Line */}
        <polyline
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data Points */}
        {coords.map((c) => {
          const isViolation =
            (maxThreshold != null && Number(c.raw[valueKey]) > Number(maxThreshold)) ||
            (minThreshold != null && Number(c.raw[valueKey]) < Number(minThreshold));
          const isBuffered = Boolean(c.raw.isBuffered);
          const isHovered = hoverIndex === c.idx;

          return (
            <g
              key={c.raw.id || c.idx}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(c.idx)}
            >
              {isBuffered ? (
                <rect
                  x={c.x - (isHovered ? 5.5 : 4)}
                  y={c.y - (isHovered ? 5.5 : 4)}
                  width={isHovered ? 11 : 8}
                  height={isHovered ? 11 : 8}
                  fill={isViolation ? '#dc2626' : '#7c3aed'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  transform={`rotate(45 ${c.x} ${c.y})`}
                />
              ) : (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6 : isViolation ? 4.8 : 3.4}
                  fill={isViolation ? '#dc2626' : primaryColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}

        {/* X-Axis Timestamps */}
        {coords.length > 0 && (
          <>
            <text x={padLeft} y={height - 10} textAnchor="start" fontSize="10.5" fill="#64748b">
              {formatTimeShort(coords[0].raw.recordedAt)}
            </text>
            {coords.length > 2 && (
              <text
                x={padLeft + plotW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10.5"
                fill="#64748b"
              >
                {formatTimeShort(coords[Math.floor(coords.length / 2)].raw.recordedAt)}
              </text>
            )}
            <text x={padLeft + plotW} y={height - 10} textAnchor="end" fontSize="10.5" fill="#64748b">
              {formatTimeShort(coords[coords.length - 1].raw.recordedAt)}
            </text>
          </>
        )}
      </svg>

      {/* Hover Tooltip Bar */}
      {hovered && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '12px'
          }}
        >
          <div>
            <strong>Thời điểm:</strong> {formatDateTimeVi(hovered.raw.recordedAt)}
          </div>
          <div>
            <strong>Giá trị:</strong>{' '}
            <span style={{ fontWeight: 700, color: primaryColor }}>
              {Number(hovered.raw[valueKey]).toFixed(1)}
              {unit}
            </span>
          </div>
          <div>
            <strong>Nguồn dữ liệu:</strong>{' '}
            {hovered.raw.isBuffered ? (
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                Đồng bộ bù (Lưu trong lúc mất kết nối)
              </span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600 }}>Thời gian thực</span>
            )}
          </div>
          <div>
            <strong>Trạng thái:</strong>{' '}
            <span
              style={{
                fontWeight: 700,
                color: hovered.raw.isAnomaly ? '#dc2626' : '#16a34a'
              }}
            >
              {hovered.raw.isAnomaly ? 'Vượt ngưỡng' : 'Bình thường'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IotMonitorPage() {
  const [deviceOptions, setDeviceOptions] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => getSelectedIotDeviceId(''));
  const [timeframe, setTimeframe] = useState('24h');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOutageId, setSelectedOutageId] = useState('');
  const [chartMode, setChartMode] = useState('BOTH');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollIntervalSec, setPollIntervalSec] = useState(5);
  const inFlightRef = useRef(false);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [selectedLogModal, setSelectedLogModal] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState('mqtt');
  const [savingConfig, setSavingConfig] = useState(false);
  const [mqttForm, setMqttForm] = useState({
    brokerHost: 'broker.emqx.io',
    brokerPort: 1883,
    topicPrefix: 'bms/sep490/iot/hkd-lab01',
    defaultDeviceId: 'BMS-IOT-001',
    isBridgeConnected: false
  });
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceId: '',
    location: '',
    minTemp: 2,
    maxTemp: 8,
    minHumidity: 45,
    maxHumidity: 75
  });

  const openConfigModal = async (tab = 'mqtt') => {
    setConfigTab(tab);
    setShowConfigModal(true);
    try {
      const cfg = await fetchIotMqttConfig();
      if (cfg) {
        setMqttForm({
          brokerHost: cfg.brokerHost || 'broker.emqx.io',
          brokerPort: cfg.brokerPort || 1883,
          topicPrefix: cfg.topicPrefix || 'bms/sep490/iot/hkd-lab01',
          defaultDeviceId: cfg.defaultDeviceId || selectedDeviceId || 'BMS-IOT-001',
          isBridgeConnected: Boolean(cfg.isBridgeConnected)
        });
      }
    } catch {
      // Non-fatal
    }
  };

  const handleSaveMqttConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await updateIotMqttConfig({
        brokerHost: mqttForm.brokerHost,
        brokerPort: Number(mqttForm.brokerPort) || 1883,
        topicPrefix: mqttForm.topicPrefix,
        defaultDeviceId: mqttForm.defaultDeviceId
      });
      setShowConfigModal(false);
      setFeedbackMsg({ type: 'success', text: `Đã cập nhật kênh MQTT (${mqttForm.topicPrefix}) và kết nối lại ngay lập tức.` });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Cập nhật cấu hình MQTT thất bại.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceForm.deviceId.trim()) return;
    setSavingConfig(true);
    try {
      const created = await createIotDevice({
        deviceId: newDeviceForm.deviceId.trim(),
        location: newDeviceForm.location.trim() || 'Blood Storage Room',
        minTemp: Number(newDeviceForm.minTemp),
        maxTemp: Number(newDeviceForm.maxTemp),
        minHumidity: Number(newDeviceForm.minHumidity),
        maxHumidity: Number(newDeviceForm.maxHumidity)
      });
      const freshList = await fetchIotDevices();
      if (Array.isArray(freshList) && freshList.length > 0) {
        setDeviceOptions(freshList);
      }
      const nextId = created?.deviceId || newDeviceForm.deviceId.trim();
      setSelectedDeviceId(nextId);
      setSelectedIotDeviceId(nextId);
      setShowConfigModal(false);
      setNewDeviceForm({ deviceId: '', location: '', minTemp: 2, maxTemp: 8, minHumidity: 45, maxHumidity: 75 });
      setFeedbackMsg({ type: 'success', text: `Đã thêm và chuyển sang theo dõi thiết bị ${nextId}.` });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Thêm thiết bị mới thất bại.' });
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchIotDevices()
      .then((list) => {
        if (!active || !Array.isArray(list) || list.length === 0) return;
        setDeviceOptions(list);
        setSelectedDeviceId((prev) => {
          const valid = prev && list.some((d) => d.id === prev);
          const nextId = valid ? prev : list[0].id;
          setSelectedIotDeviceId(nextId);
          return nextId;
        });
      })
      .catch(() => {
        // Keep current selection if device list fetch fails transiently
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!selectedDeviceId) {
        if (!silent) setLoading(false);
        return;
      }
      if (silent && inFlightRef.current) return;
      inFlightRef.current = true;
      if (!silent) setLoading(true);
      try {
        const tfObj = TIMEFRAME_OPTIONS.find((t) => t.id === timeframe);
        let computedFrom = fromDate ? new Date(fromDate).toISOString() : undefined;
        const computedTo = toDate ? new Date(toDate).toISOString() : undefined;

        if (!computedFrom && tfObj && tfObj.hours) {
          computedFrom = new Date(Date.now() - tfObj.hours * 3600 * 1000).toISOString();
        }

        const data = await getIotMonitorDashboard({
          deviceId: selectedDeviceId,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: debouncedSearch || undefined,
          fromDate: computedFrom,
          toDate: computedTo,
          outageId: selectedOutageId || undefined,
          page: 1,
          pageSize: 120
        });
        setDashboard(data);
      } catch (err) {
        if (!silent) {
          setFeedbackMsg({
            type: 'error',
            text: err?.message || 'Không thể tải dữ liệu giám sát môi trường.'
          });
        }
      } finally {
        inFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [selectedDeviceId, timeframe, statusFilter, debouncedSearch, fromDate, toDate, selectedOutageId]
  );

  useEffect(() => {
    let active = true;
    fetchIotDevices()
      .then((list) => {
        if (!active || !Array.isArray(list) || list.length === 0) return;
        setDeviceOptions(list);
        setSelectedDeviceId((prev) => {
          const valid = prev && list.some((d) => d.id === prev);
          const nextId = valid ? prev : list[0].id;
          setSelectedIotDeviceId(nextId);
          return nextId;
        });
      })
      .catch(() => {
        // Keep current selection if device list fetch fails transiently
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    let active = true;
    fetchIotDevices()
      .then((list) => {
        if (!active || !Array.isArray(list) || list.length === 0) return;
        setDeviceOptions(list);
        setSelectedDeviceId((prev) => {
          const valid = prev && list.some((d) => d.id === prev);
          const nextId = valid ? prev : list[0].id;
          setSelectedIotDeviceId(nextId);
          return nextId;
        });
      })
      .catch(() => {
        // Keep current selection if device list fetch fails transiently
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      loadDashboard(true);
    }, pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, pollIntervalSec, loadDashboard]);

  const connection = dashboard?.connection || {
    deviceId: selectedDeviceId,
    isConnected: loading,
    connectionState: loading ? 'CONNECTING' : 'DISCONNECTED',
    secondsSinceLastSeen: 0,
    expectedIntervalSeconds: 5,
    disconnectThresholdSeconds: 30,
    alertMessage: 'Mất kết nối đến thiết bị cảm biến. Không thể nhận dữ liệu thời gian thực!'
  };

  const summary = dashboard?.summary || {
    currentTemperature: 0,
    minTemperature: 0,
    maxTemperature: 0,
    avgTemperature: 0,
    meanKineticTemperature: 0,
    currentHumidity: null,
    minHumidity: null,
    maxHumidity: null,
    avgHumidity: null,
    minAllowedTemp: 2.0,
    maxAllowedTemp: 8.0,
    minAllowedHumidity: 45.0,
    maxAllowedHumidity: 75.0,
    totalReadings: 0,
    violationReadings: 0,
    bufferedReadingsCount: 0,
    outageCount: 0
  };

  const logs = dashboard?.items || [];
  const chartSeries = dashboard?.chartSeries || [];
  const outages = dashboard?.outages || [];

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    Boolean(searchInput.trim()) ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(selectedOutageId) ||
    timeframe !== '24h';

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setSearchInput('');
    setDebouncedSearch('');
    setFromDate('');
    setToDate('');
    setSelectedOutageId('');
    setTimeframe('24h');
  };

  const handleExportCsv = () => {
    if (!logs.length) return;
    const headers = [
      'Mã Bản Ghi',
      'Mã Thiết Bị',
      'Vị Trí',
      'Thời Điểm Đo',
      'Nhiệt Độ (°C)',
      'Độ Ẩm (%)',
      'MKT (°C)',
      'Trạng Thái',
      'Nguồn Dữ Liệu',
      'Ghi Chú'
    ];
    const rows = logs.map((l) => [
      l.id,
      l.deviceId,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      formatDateTimeVi(l.recordedAt),
      Number(l.temperature).toFixed(2),
      l.humidity != null ? Number(l.humidity).toFixed(2) : '',
      Number(l.meanKineticTemperature || l.temperature).toFixed(2),
      l.isAnomaly ? 'Vượt ngưỡng' : 'Bình thường',
      l.isBuffered ? 'Đồng bộ sau mất kết nối' : 'Trực tuyến',
      `"${(l.alertMessage || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhat-ky-nhiet-do-do-am-${selectedDeviceId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cleanDisconnectionMsg = (connection.alertMessage || '').replace(/^MSG-[A-Z]+-\d+:\s*/i, '');

  return (
    <div className="bms-page-wrap" style={{ padding: '24px', maxWidth: '1480px', margin: '0 auto' }}>
      <IotNavigationTabs connectionStatus={connection} />

      {/* 1. DISCONNECTION WARNING BANNER */}
      {!connection.isConnected && (
        <div
          role="alert"
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '2px solid #ef4444',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 6px 18px rgba(220, 38, 38, 0.14)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#dc2626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <WifiOff size={24} />
            </div>
            <div>
              <strong style={{ fontSize: '15px', color: '#7f1d1d' }}>
                CẢNH BÁO MẤT KẾT NỐI THIẾT BỊ CẢM BIẾN ({connection.deviceId})
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#991b1b', lineHeight: 1.45 }}>
                {cleanDisconnectionMsg ||
                  'Mất kết nối đến thiết bị cảm biến môi trường. Không thể nhận dữ liệu thời gian thực!'}{' '}
                Thời gian gián đoạn: <strong>{formatDurationVi(connection.secondsSinceLastSeen)}</strong> (Tín hiệu
                cuối: <strong>{formatDateTimeVi(connection.lastSeenAt)}</strong>).
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>
                Thiết bị đang tự động lưu trữ nhiệt độ và độ ẩm trong thời gian mất kết nối. Khi kết nối được khôi
                phục, dữ liệu trong khoảng gián đoạn sẽ tự động đồng bộ và hiển thị lại trên biểu đồ.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RECOVERED OUTAGE NOTIFICATION BANNER */}
      {connection.isConnected && connection.lastRecoveredOutage && (
        <div
          style={{
            background: '#f5f3ff',
            border: '1px solid #c4b5fd',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4c1d95' }}>
            <Database size={18} color="#7c3aed" />
            <div>
              <strong>Đã khôi phục kết nối cảm biến!</strong> Khoảng mất kết nối gần nhất từ{' '}
              <strong>{formatDateTimeVi(connection.lastRecoveredOutage.disconnectedAt)}</strong> đến{' '}
              <strong>{formatDateTimeVi(connection.lastRecoveredOutage.reconnectedAt)}</strong> (
              {formatDurationVi(connection.lastRecoveredOutage.durationSeconds)}) đã được đồng bộ bù{' '}
              <strong>{connection.lastRecoveredOutage.bufferedRecordsSynced} bản ghi</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedOutageId((prev) =>
                prev === connection.lastRecoveredOutage.id ? '' : connection.lastRecoveredOutage.id
              )
            }
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #7c3aed',
              background:
                selectedOutageId === connection.lastRecoveredOutage.id ? '#7c3aed' : '#ffffff',
              color:
                selectedOutageId === connection.lastRecoveredOutage.id ? '#ffffff' : '#6d28d9',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {selectedOutageId === connection.lastRecoveredOutage.id
              ? 'Hiển thị toàn bộ dữ liệu'
              : 'Xem dữ liệu khoảng mất kết nối này'}
          </button>
        </div>
      )}

      {/* 3. PAGE HEADER CARD */}
      <div
        className="bms-page-header-card"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Giám Sát Nhiệt Độ &amp; Độ Ẩm Kho Bảo Quản
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                background: connection.isConnected ? '#dcfce7' : '#fee2e2',
                color: connection.isConnected ? '#15803d' : '#b91c1c'
              }}
            >
              {connection.isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connection.isConnected ? 'ĐANG TRỰC TUYẾN' : 'MẤT KẾT NỐI'}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Theo dõi thời gian thực nhiệt độ, độ ẩm tủ bảo quản máu và lịch sử ghi nhận từ hệ thống cảm biến.
          </p>
        </div>

        {/* Device Selector & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedDeviceId(nextId);
              setSelectedIotDeviceId(nextId);
              setSelectedOutageId('');
            }}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0f172a',
              background: '#f8fafc'
            }}
          >
            {deviceOptions.length === 0 ? (
              <option value={selectedDeviceId || ''}>{selectedDeviceId || 'Đang tải thiết bị...'}</option>
            ) : (
              deviceOptions.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.label}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            onClick={() => openConfigModal('mqtt')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Sliders size={12} />
            Cấu hình MQTT / Thiết bị
          </button>

          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: autoRefresh ? '#eff6ff' : '#ffffff',
              color: autoRefresh ? '#1e40af' : '#475569',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            {autoRefresh ? `Tự động cập nhật (${pollIntervalSec}s)` : 'Đã tạm dừng cập nhật'}
          </button>

          <select
            value={pollIntervalSec}
            onChange={(e) => setPollIntervalSec(Number(e.target.value))}
            title="Chu kỳ làm mới dữ liệu"
            style={{
              padding: '9px 10px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#1e40af',
              background: '#ffffff'
            }}
          >
            <option value={3}>Cập nhật: 3 giây</option>
            <option value={5}>Cập nhật: 5 giây</option>
            <option value={10}>Cập nhật: 10 giây</option>
          </select>

          <Link
            to="/manager/iot-thresholds"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '9px',
              background: '#1e40af',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          >
            <Sliders size={14} />
            Cấu hình ngưỡng
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          style={{
            marginBottom: '16px',
            padding: '11px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            background:
              feedbackMsg.type === 'error'
                ? '#fef2f2'
                : feedbackMsg.type === 'warning'
                ? '#fffbeb'
                : '#f0fdf4',
            color:
              feedbackMsg.type === 'error'
                ? '#b91c1c'
                : feedbackMsg.type === 'warning'
                ? '#b45309'
                : '#15803d',
            border: `1px solid ${
              feedbackMsg.type === 'error'
                ? '#fecaca'
                : feedbackMsg.type === 'warning'
                ? '#fde68a'
                : '#bbf7d0'
            }`
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. KPI METRIC CARDS (6 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>NHIỆT ĐỘ HIỆN TẠI</span>
            <Thermometer size={18} color="#1e40af" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {Number(summary.currentTemperature || 0).toFixed(1)}°C
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Thấp: <strong>{Number(summary.minTemperature || 0).toFixed(1)}°C</strong> · TB:{' '}
            <strong>{Number(summary.avgTemperature || 0).toFixed(1)}°C</strong> · Cao:{' '}
            <strong>{Number(summary.maxTemperature || 0).toFixed(1)}°C</strong>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ĐỘ ẨM HIỆN TẠI</span>
            <Droplets size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {summary.currentHumidity != null ? `${Number(summary.currentHumidity).toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Thấp: <strong>{summary.minHumidity != null ? `${Number(summary.minHumidity).toFixed(1)}%` : '—'}</strong> ·
            TB: <strong>{summary.avgHumidity != null ? `${Number(summary.avgHumidity).toFixed(1)}%` : '—'}</strong> ·
            Cao: <strong>{summary.maxHumidity != null ? `${Number(summary.maxHumidity).toFixed(1)}%` : '—'}</strong>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>NHIỆT ĐỘ ĐỘNG HỌC (MKT)</span>
            <Activity size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {Number(summary.meanKineticTemperature || 0).toFixed(2)}°C
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Đánh giá độ ổn định nhiệt bảo quản
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>NGƯỠNG AN TOÀN</span>
            <Sliders size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e40af', marginTop: '8px' }}>
            {summary.minAllowedTemp}°C – {summary.maxAllowedTemp}°C &nbsp;|&nbsp; {summary.minAllowedHumidity}% –{' '}
            {summary.maxAllowedHumidity}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Chu kỳ cảm biến gửi dữ liệu: {connection.expectedIntervalSeconds} giây
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>DỮ LIỆU ĐỒNG BỘ BÙ</span>
            <Database size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {summary.bufferedReadingsCount || 0}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600 }}>bản ghi</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Số lần gián đoạn kết nối: <strong>{summary.outageCount || 0} lần</strong>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>MẪU VƯỢT NGƯỠNG</span>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: summary.violationReadings > 0 ? '#dc2626' : '#16a34a',
              marginTop: '6px'
            }}
          >
            {summary.violationReadings || 0} / {summary.totalReadings || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Tín hiệu gần nhất: {formatDateTimeVi(connection.lastSeenAt)}
          </div>
        </div>
      </div>

      {/* 5. TIME-SERIES CHARTS SECTION */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {TIMEFRAME_OPTIONS.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: timeframe === tf.id ? '1px solid #1e40af' : '1px solid #cbd5e1',
                  background: timeframe === tf.id ? '#1e40af' : '#ffffff',
                  color: timeframe === tf.id ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[
              { id: 'BOTH', label: 'Cả Nhiệt độ & Độ ẩm' },
              { id: 'TEMP', label: 'Chỉ Nhiệt độ (°C)' },
              { id: 'HUM', label: 'Chỉ Độ ẩm (%)' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setChartMode(m.id)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  border: chartMode === m.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  background: chartMode === m.id ? '#0f172a' : '#ffffff',
                  color: chartMode === m.id ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: chartMode === 'BOTH' ? 'repeat(auto-fit, minmax(520px, 1fr))' : '1fr',
            gap: '16px'
          }}
        >
          {(chartMode === 'BOTH' || chartMode === 'TEMP') && (
            <TelemetryTimeSeriesChart
              title={`Biểu đồ Nhiệt độ theo thời gian (${selectedDeviceId})`}
              subtitle={`Ngưỡng an toàn: ${summary.minAllowedTemp}°C – ${summary.maxAllowedTemp}°C`}
              unit="°C"
              dataPoints={chartSeries}
              valueKey="temperature"
              minThreshold={summary.minAllowedTemp}
              maxThreshold={summary.maxAllowedTemp}
              outages={outages}
              primaryColor="#1e40af"
              safeBandColor="rgba(16, 185, 129, 0.08)"
              icon={Thermometer}
              selectedOutageId={selectedOutageId}
            />
          )}

          {(chartMode === 'BOTH' || chartMode === 'HUM') && (
            <TelemetryTimeSeriesChart
              title={`Biểu đồ Độ ẩm theo thời gian (${selectedDeviceId})`}
              subtitle={`Ngưỡng độ ẩm an toàn: ${summary.minAllowedHumidity}% – ${summary.maxAllowedHumidity}%`}
              unit="%"
              dataPoints={chartSeries}
              valueKey="humidity"
              minThreshold={summary.minAllowedHumidity}
              maxThreshold={summary.maxAllowedHumidity}
              outages={outages}
              primaryColor="#0284c7"
              safeBandColor="rgba(14, 165, 233, 0.08)"
              icon={Droplets}
              selectedOutageId={selectedOutageId}
            />
          )}
        </div>
      </div>

      {/* 6. CONNECTION OUTAGE & BUFFER RECOVERY HISTORY TABLE */}
      {outages.length > 0 && (
        <div
          className="bms-table-standalone-section"
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#7c3aed" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Lịch sử Khoảng Mất Kết Nối &amp; Đồng Bộ Dữ Liệu ({outages.length})
              </h3>
            </div>
            {selectedOutageId && (
              <button
                type="button"
                onClick={() => setSelectedOutageId('')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hiển thị lại tất cả bản ghi
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="bms-dash-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Thiết bị</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Thời điểm mất kết nối</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Thời điểm kết nối lại</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thời lượng gián đoạn</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Dữ liệu đã đồng bộ bù</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {outages.slice(0, 8).map((o) => {
                  const isSelected = selectedOutageId === o.id;
                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f5f3ff' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{o.deviceId}</td>
                      <td style={{ padding: '10px 12px' }}>{formatDateTimeVi(o.disconnectedAt)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.reconnectedAt ? formatDateTimeVi(o.reconnectedAt) : 'Đang mất kết nối...'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatDurationVi(o.durationSeconds)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#6d28d9'
                        }}
                      >
                        {o.bufferedRecordsSynced || 0} bản ghi
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: o.status === 'Ongoing' ? '#fee2e2' : '#dcfce7',
                            color: o.status === 'Ongoing' ? '#b91c1c' : '#15803d'
                          }}
                        >
                          {o.status === 'Ongoing' ? 'ĐANG MẤT KẾT NỐI' : 'ĐÃ KHÔI PHỤC'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutageId(isSelected ? '' : o.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: '1px solid #c4b5fd',
                            background: isSelected ? '#7c3aed' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#6d28d9',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? 'Bỏ lọc' : 'Xem dữ liệu khoảng này'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TEMPERATURE & HUMIDITY LOGS TABLE */}
      <div
        className="bms-table-standalone-section"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Nhật Ký Dữ Liệu Nhiệt Độ &amp; Độ Ẩm Theo Thời Gian
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Hiển thị {logs.length} bản ghi gần nhất · Bao gồm cả dữ liệu trực tuyến và dữ liệu đồng bộ bù khi mất kết
              nối.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!logs.length}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: logs.length ? 'pointer' : 'not-allowed'
            }}
          >
            <Download size={14} />
            Xuất file CSV ({logs.length})
          </button>
        </div>

        {/* Filter Bar */}
        <div
          className="bms-filter-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '10px',
            marginBottom: '16px'
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search
              size={15}
              color="#64748b"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo thiết bị, vị trí kho, trạng thái..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="NORMAL">Bình thường</option>
            <option value="VIOLATION">Vượt ngưỡng an toàn</option>
            <option value="BUFFERED">Dữ liệu đồng bộ bù khi mất kết nối</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <span>Từ:</span>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: '7px 9px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
            <span>Đến:</span>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: '7px 9px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px'
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: hasActiveFilters ? '#ffffff' : '#f1f5f9',
              color: hasActiveFilters ? '#dc2626' : '#94a3b8',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed'
            }}
          >
            Xóa bộ lọc
          </button>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table className="bms-dash-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc', color: '#334155' }}>
                <th style={{ padding: '11px 12px', textAlign: 'left' }}>Thời gian đo</th>
                <th style={{ padding: '11px 12px', textAlign: 'left' }}>Thiết bị &amp; Vị trí</th>
                <th style={{ padding: '11px 12px', textAlign: 'right' }}>Nhiệt độ (°C)</th>
                <th style={{ padding: '11px 12px', textAlign: 'right' }}>Độ ẩm (%)</th>
                <th style={{ padding: '11px 12px', textAlign: 'right' }}>MKT (°C)</th>
                <th style={{ padding: '11px 12px', textAlign: 'center' }}>Nguồn dữ liệu</th>
                <th style={{ padding: '11px 12px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '11px 12px', textAlign: 'left' }}>Ghi chú</th>
                <th style={{ padding: '11px 12px', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Đang tải dữ liệu giám sát nhiệt độ &amp; độ ẩm...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Không có bản ghi nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                logs.map((row) => {
                  const isViolation = row.isAnomaly || row.status === 'Warning' || row.status === 'Critical';
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isViolation
                          ? 'rgba(254, 242, 242, 0.55)'
                          : row.isBuffered
                          ? 'rgba(245, 243, 255, 0.45)'
                          : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {formatDateTimeVi(row.recordedAt)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.deviceId}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>{row.location}</div>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: isViolation ? '#dc2626' : '#1e40af',
                          fontFamily: 'monospace'
                        }}
                      >
                        {Number(row.temperature).toFixed(1)}°C
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0284c7',
                          fontFamily: 'monospace'
                        }}
                      >
                        {row.humidity != null ? `${Number(row.humidity).toFixed(1)}%` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          color: '#475569',
                          fontFamily: 'monospace'
                        }}
                      >
                        {Number(row.meanKineticTemperature || row.temperature).toFixed(2)}°C
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {row.isBuffered ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#ede9fe',
                              color: '#6d28d9'
                            }}
                          >
                            ĐỒNG BỘ BÙ
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#334155'
                            }}
                          >
                            TRỰC TUYẾN
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isViolation ? '#fee2e2' : '#dcfce7',
                            color: isViolation ? '#b91c1c' : '#15803d'
                          }}
                        >
                          {isViolation ? 'VƯỢT NGƯỠNG' : 'BÌNH THƯỜNG'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', maxWidth: '280px' }}>
                        {row.alertMessage || (row.isBuffered ? 'Lưu trong lúc mất kết nối & đồng bộ lại' : 'Ổn định')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLogModal(row)}
                          style={{
                            padding: '5px 9px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <Eye size={13} />
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. DETAIL MODAL */}
      {showConfigModal && (
        <div
          onClick={() => setShowConfigModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Cấu Hình Kết Nối MQTT &amp; Thiết Bị IoT
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setConfigTab('mqtt')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: configTab === 'mqtt' ? '#1e40af' : '#f8fafc',
                  color: configTab === 'mqtt' ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Kênh MQTT Broker
              </button>
              <button
                type="button"
                onClick={() => setConfigTab('device')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: configTab === 'device' ? '#1e40af' : '#f8fafc',
                  color: configTab === 'device' ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                + Thêm / Kết nối thiết bị mới
              </button>
            </div>

            {configTab === 'mqtt' ? (
              <form onSubmit={handleSaveMqttConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      MQTT Broker Host
                    </label>
                    <input
                      type="text"
                      required
                      value={mqttForm.brokerHost}
                      onChange={(e) => setMqttForm({ ...mqttForm, brokerHost: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Port
                    </label>
                    <input
                      type="number"
                      required
                      value={mqttForm.brokerPort}
                      onChange={(e) => setMqttForm({ ...mqttForm, brokerPort: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Tên kênh MQTT riêng (Topic Prefix)
                  </label>
                  <input
                    type="text"
                    required
                    value={mqttForm.topicPrefix}
                    onChange={(e) => setMqttForm({ ...mqttForm, topicPrefix: e.target.value })}
                    placeholder="bms/sep490/iot/hkd-lab01"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#334155' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    Topic đồng bộ với mạch ESP32 ({mqttForm.isBridgeConnected ? 'Đang kết nối Broker' : 'Đang chờ kết nối'}):
                  </div>
                  <div style={{ fontFamily: 'monospace', color: '#0369a1' }}>{mqttForm.topicPrefix}/{selectedDeviceId || mqttForm.defaultDeviceId}/telemetry</div>
                  <div style={{ fontFamily: 'monospace', color: '#0369a1' }}>{mqttForm.topicPrefix}/{selectedDeviceId || mqttForm.defaultDeviceId}/status</div>
                  <div style={{ fontFamily: 'monospace', color: '#0369a1' }}>{mqttForm.topicPrefix}/{selectedDeviceId || mqttForm.defaultDeviceId}/config</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowConfigModal(false)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Đóng
                  </button>
                  <button type="submit" disabled={savingConfig} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1e40af', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {savingConfig ? 'Đang kết nối lại...' : 'Lưu & Kết nối lại MQTT'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateDevice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Mã Thiết Bị (Device ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDeviceForm.deviceId}
                      onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceId: e.target.value })}
                      placeholder="VD: BMS-IOT-002"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Vị trí tủ bảo quản / Phòng
                    </label>
                    <input
                      type="text"
                      value={newDeviceForm.location}
                      onChange={(e) => setNewDeviceForm({ ...newDeviceForm, location: e.target.value })}
                      placeholder="VD: Blood Storage Room 02"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Min °C</label>
                    <input type="number" step="0.5" value={newDeviceForm.minTemp} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, minTemp: e.target.value })} style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Max °C</label>
                    <input type="number" step="0.5" value={newDeviceForm.maxTemp} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, maxTemp: e.target.value })} style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Min %</label>
                    <input type="number" step="1" value={newDeviceForm.minHumidity} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, minHumidity: e.target.value })} style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Max %</label>
                    <input type="number" step="1" value={newDeviceForm.maxHumidity} onChange={(e) => setNewDeviceForm({ ...newDeviceForm, maxHumidity: e.target.value })} style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowConfigModal(false)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Đóng
                  </button>
                  <button type="submit" disabled={savingConfig} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1e40af', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {savingConfig ? 'Đang thêm...' : 'Thêm & Theo dõi thiết bị'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedLogModal && (
        <div
          onClick={() => setSelectedLogModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#ffffff',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                Chi Tiết Bản Ghi Nhiệt Độ &amp; Độ Ẩm
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '13px',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div>
                <div style={{ color: '#64748b' }}>Mã bản ghi</div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>{selectedLogModal.id}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Thiết bị &amp; Vị trí</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>
                  {selectedLogModal.deviceId} — {selectedLogModal.location}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Thời điểm cảm biến đo</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{formatDateTimeVi(selectedLogModal.recordedAt)}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Thời điểm hệ thống lưu</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{formatDateTimeVi(selectedLogModal.receivedAt)}</div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Nhiệt độ / Độ ẩm</div>
                <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '15px', marginTop: '2px' }}>
                  {Number(selectedLogModal.temperature).toFixed(2)}°C &nbsp;|&nbsp;{' '}
                  {selectedLogModal.humidity != null ? `${Number(selectedLogModal.humidity).toFixed(2)}%` : '—'}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b' }}>Ngưỡng an toàn áp dụng</div>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>
                  {selectedLogModal.minAllowedTemp}°C – {selectedLogModal.maxAllowedTemp}°C ·{' '}
                  {selectedLogModal.minAllowedHumidity}% – {selectedLogModal.maxAllowedHumidity}%
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: '#64748b' }}>Phương thức ghi nhận</div>
                <div style={{ fontWeight: 700, marginTop: '2px', color: selectedLogModal.isBuffered ? '#6d28d9' : '#15803d' }}>
                  {selectedLogModal.isBuffered
                    ? 'Dữ liệu được lưu tạm trên thiết bị trong lúc mất kết nối và đồng bộ bù sau khi kết nối lại'
                    : 'Ghi nhận trực tuyến theo thời gian thực'}
                </div>
              </div>
              {selectedLogModal.alertMessage && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ color: '#64748b' }}>Cảnh báo</div>
                  <div style={{ fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
                    {selectedLogModal.alertMessage}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1e40af',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

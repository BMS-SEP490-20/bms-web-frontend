/**
 * @file ConfigureIotThresholdsPage.jsx
 * @description UC67 — Cấu Hình Ngưỡng Cảnh Báo Cảm Biến Môi Trường IoT Tủ Trữ Mẫu Xét Nghiệm & Sinh Phẩm.
 * Dành riêng cho thẩm quyền Trưởng Khoa / Quản Lý Phòng Lab (Manager) & Quản Trị Hệ Thống.
 * Tuân thủ tiêu chuẩn: ISO 15189 (Quản lý chuỗi lạnh Cold-Chain 2°C - 8°C), Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import IotNavigationTabs from '../../iot/components/IotNavigationTabs';
import {
    FaShieldAlt,
    FaCogs,
    FaSave,
    FaUndo,
    FaThermometerHalf,
    FaPlus,
    FaBell
} from 'react-icons/fa';
import {
    fetchIotThresholdsSummary,
    batchUpdateIotThresholds,
    resetDefaultIotThresholds
} from '../api/iotThresholdApi';

export default function ConfigureIotThresholdsPage() {
    const navigate = useNavigate();

    const [thresholds, setThresholds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const data = await fetchIotThresholdsSummary();
            if (data) {
                const rawThresholds = data.thresholds || (Array.isArray(data) ? data : []);
                setThresholds(Array.isArray(rawThresholds) ? rawThresholds : []);
            }
        } catch (err) {
            console.error('Lỗi khi tải cấu hình ngưỡng cảm biến IoT:', err);
            setErrorMessage('Không thể tải dữ liệu ngưỡng cảm biến IoT từ máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    const handleThresholdChange = (deviceId, field, value) => {
        setThresholds(prev => (Array.isArray(prev) ? prev : []).map(item => {
            if (item.deviceId === deviceId) {
                return {
                    ...item,
                    [field]: field === 'intervalSeconds' ? parseInt(value) || 0 : parseFloat(value) || 0
                };
            }
            return item;
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const payload = (Array.isArray(thresholds) ? thresholds : []).map(t => ({
                deviceId: t.deviceId,
                lowAlert: t.lowAlert,
                highAlert: t.highAlert,
                intervalSeconds: t.intervalSeconds
            }));

            const result = await batchUpdateIotThresholds(payload);
            if (result) {
                const updated = result.thresholds || (Array.isArray(result) ? result : thresholds);
                setThresholds(Array.isArray(updated) ? updated : thresholds);
                window.dispatchEvent(new CustomEvent('bms-iot-status-changed'));
                setSuccessMessage('Đã lưu thành công cấu hình ngưỡng cảnh báo và chu kỳ đo cho toàn bộ cảm biến IoT.');
                setTimeout(() => setSuccessMessage(''), 4000);
            }
        } catch (err) {
            console.error('Lỗi khi lưu ngưỡng IoT:', err);
            setErrorMessage('Lỗi khi cập nhật cấu hình ngưỡng. Vui lòng kiểm tra lại dải giá trị giới hạn.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ ngưỡng cảm biến về giá trị chuẩn y tế ISO 15189 (2°C - 8°C cho tủ lạnh bảo quản)?')) {
            return;
        }

        setResetting(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await resetDefaultIotThresholds();
            if (result) {
                const restored = result.thresholds || (Array.isArray(result) ? result : []);
                setThresholds(Array.isArray(restored) ? restored : []);
                window.dispatchEvent(new CustomEvent('bms-iot-status-changed'));
                setSuccessMessage('Đã khôi phục toàn bộ ngưỡng về quy chuẩn chuỗi lạnh y tế (Cold-Chain Standard).');
                setTimeout(() => setSuccessMessage(''), 4000);
            }
        } catch (err) {
            console.error('Lỗi khi khôi phục chuẩn mặc định:', err);
            setErrorMessage('Khôi phục ngưỡng chuẩn thất bại.');
        } finally {
            setResetting(false);
        }
    };

    const safeThresholds = useMemo(() => (Array.isArray(thresholds) ? thresholds : []), [thresholds]);

    return (
        <div className="w-100 py-1">
            <IotNavigationTabs />
            {/* Master Luxury Page Header Card */}
            <div className="bms-page-header-card">
                <div className="bms-page-header-content">
                    
                    <div className="bms-page-title-row">
                        
                        <h1 className="bms-page-title">
                            Cấu Hình Ngưỡng Cảm Biến Môi Trường IoT Tủ Trữ Mẫu
                        </h1>
                    </div>
                    
                </div>

                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 shadow-sm px-3.5 py-2 fw-semibold"
                        style={{ borderRadius: '9999px', borderColor: 'rgba(15, 23, 42, 0.05)' }}
                        onClick={handleResetDefaults}
                        disabled={resetting}
                    >
                        <FaUndo size={12} />
                        <span>{resetting ? 'Đang khôi phục...' : 'Khôi Phục Chuẩn (2°C - 8°C)'}</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 shadow-sm text-white px-3 py-2 fw-semibold"
                        style={{ borderRadius: '9999px', backgroundColor: '#1E60E6', borderColor: '#1E60E6', boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)' }}
                        onClick={handleSaveAll}
                        disabled={saving}
                    >
                        <FaSave size={13} />
                        <span>{saving ? 'Đang lưu...' : 'Lưu Tất Cả Ngưỡng'}</span>
                    </button>
                </div>
            </div>

            {/* Thông báo Alert */}
            {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center mb-3" style={{ borderRadius: '14px', fontSize: '13.5px' }}>
                    <i className="bi bi-exclamation-octagon-fill me-2"></i>
                    <div>{errorMessage}</div>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: '14px', fontSize: '13.5px' }}>
                    <i className="bi bi-check-circle-fill me-2" style={{ color: '#2b8a3e' }}></i>
                    <div>{successMessage}</div>
                </div>
            )}

            {/* Standalone Independent Table Section (ZERO TABLE IN CARDS) */}
            <div className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h5 className="bms-table-standalone-title">
                            <FaCogs style={{ color: '#1E60E6' }} />
                            <span>Danh Sách Ngưỡng Cảnh Báo Thiết Bị Cảm Biến</span>
                        </h5>
                        <div className="bms-table-standalone-subtitle">
                            {safeThresholds.length} thiết bị giám sát chuỗi lạnh Cold-Chain theo chuẩn ISO 15189
                        </div>
                    </div>
                </div>

                <div className="bms-table-standalone-body">
                    {loading ? (
                        <div className="p-3 text-center text-muted">
                            <div className="spinner-border text-primary" role="status"></div>
                            <div className="mt-2" style={{ fontSize: '13px' }}>Đang nạp dữ liệu ngưỡng cảm biến IoT...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="bms-dash-table">
                            <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '12px' }}>
                                <tr>
                                    <th style={{ paddingLeft: '20px' }}>Mã Thiết Bị</th>
                                    <th>Vị Trí Tủ Trữ / Phòng Lab</th>
                                    <th>Loại Cảm Biến</th>
                                    <th style={{ textAlign: 'right' }}>Ngưỡng Dưới</th>
                                    <th style={{ textAlign: 'right' }}>Ngưỡng Trên</th>
                                    <th style={{ textAlign: 'center' }}>Chu Kỳ Đo (Giây)</th>
                                    <th style={{ paddingRight: '20px' }}>Trạng Thái Cảm Biến</th>
                                </tr>
                            </thead>
                            <tbody>
                                {safeThresholds.map((device) => {
                                    const isTemp = device.sensorType === 'Temperature';
                                    return (
                                        <tr key={device.deviceId}>
                                            <td style={{ paddingLeft: '20px', fontFamily: 'monospace', fontWeight: '700', color: '#0284c7' }}>
                                                {device.deviceId}
                                            </td>
                                            <td style={{ color: '#1e293b', fontWeight: '500' }}>
                                                {device.location}
                                            </td>
                                            <td>
                                                {isTemp ? (
                                                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px' }}>
                                                        <i className="bi bi-thermometer-half me-1"></i> Nhiệt Độ (°C)
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px' }}>
                                                        <i className="bi bi-moisture me-1"></i> Độ Ẩm (%)
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    className="form-control d-inline-block text-end"
                                                    style={{ width: '80px', height: '32px', fontSize: '13px', padding: '2px 8px' }}
                                                    value={device.lowAlert}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'lowAlert', e.target.value)}
                                                /> <span className="text-muted small">{device.unit}</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    className="form-control d-inline-block text-end"
                                                    style={{ width: '80px', height: '32px', fontSize: '13px', padding: '2px 8px' }}
                                                    value={device.highAlert}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'highAlert', e.target.value)}
                                                /> <span className="text-muted small">{device.unit}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    className="form-control d-inline-block text-center"
                                                    style={{ width: '70px', height: '32px', fontSize: '13px', padding: '2px 8px' }}
                                                    value={device.intervalSeconds}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'intervalSeconds', e.target.value)}
                                                />
                                            </td>
                                            <td style={{ paddingRight: '20px' }}>
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                                                    ● {device.status === 'Active' || device.status === 'online' ? 'Đang Hoạt Động' : 'Trực Tuyến'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            </div>

        </div>
    );
}

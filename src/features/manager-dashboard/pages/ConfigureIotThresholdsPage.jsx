/**
 * @file ConfigureIotThresholdsPage.jsx
 * @description UC67 — Cấu Hình Ngưỡng Cảnh Báo Cảm Biến Môi Trường IoT Tủ Trữ Mẫu Xét Nghiệm & Sinh Phẩm.
 * Dành riêng cho thẩm quyền Trưởng Khoa / Quản Lý Phòng Lab (Manager) & Quản Trị Hệ Thống.
 * Tuân thủ tiêu chuẩn: ISO 15189 (Quản lý chuỗi lạnh Cold-Chain 2°C - 8°C), Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import IotNavigationTabs from '../../iot/components/IotNavigationTabs';
import { Settings, Save, Undo2, Thermometer, Droplets, AlertOctagon, CheckCircle2, Lock as LucideLock } from 'lucide-react';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';
import {
    fetchIotThresholdsSummary,
    batchUpdateIotThresholds,
    resetDefaultIotThresholds
} from '../api/iotThresholdApi';

export default function ConfigureIotThresholdsPage() {
    const navigate = useNavigate();
    const isManager = hasRole(getStoredUser(), ROLES.MANAGER);

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
        if (!window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ ngưỡng cảm biến về giá trị mặc định (2°C - 8°C cho tủ lạnh bảo quản)?')) {
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
                setSuccessMessage('Đã khôi phục toàn bộ ngưỡng về giá trị mặc định chuỗi lạnh bảo quản.');
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
            {/* Page Header Card FIRST, then IotNavigationTabs below */}
            <div className="bms-page-header-card mb-3">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Cấu Hình Ngưỡng Cảm Biến Môi Trường IoT Tủ Trữ Mẫu
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Thiết lập giới hạn cảnh báo nhiệt độ, độ ẩm và chu kỳ cập nhật cho từng thiết bị cảm biến
                    </p>
                </div>

                <div className="bms-page-actions">
                    {isManager ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill"
                                onClick={handleResetDefaults}
                                disabled={resetting}
                            >
                                <Undo2 size={12} />
                                <span>{resetting ? 'Đang khôi phục...' : 'Khôi Phục Mặc Định (2°C - 8°C)'}</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm d-flex align-items-center gap-2 text-white px-3 py-2 fw-semibold rounded-pill"
                                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                                onClick={handleSaveAll}
                                disabled={saving}
                            >
                                <Save size={13} />
                                <span>{saving ? 'Đang lưu...' : 'Lưu Tất Cả Ngưỡng'}</span>
                            </button>
                        </>
                    ) : (
                        <span className="badge d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                            <LucideLock size={13} />
                            Chỉ xem (Chỉ Quản lý phòng Lab được thay đổi ngưỡng)
                        </span>
                    )}
                </div>
            </div>

            <IotNavigationTabs />

            {/* Thông báo Alert */}
            {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center mb-3" style={{ borderRadius: '14px', fontSize: '13.5px' }}>
                    <AlertOctagon size={16} className="me-2 flex-shrink-0" />
                    <div>{errorMessage}</div>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: '14px', fontSize: '13.5px' }}>
                    <CheckCircle2 size={16} className="me-2 flex-shrink-0" style={{ color: '#2b8a3e' }} />
                    <div>{successMessage}</div>
                </div>
            )}

            {/* Standalone Independent Table Section */}
            <div className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h5 className="bms-table-standalone-title">
                            <Settings style={{ color: '#1E60E6' }}  size="1em"/>
                            <span>Danh Sách Ngưỡng Cảnh Báo Thiết Bị Cảm Biến</span>
                        </h5>
                        <div className="bms-table-standalone-subtitle">
                            {safeThresholds.length} thiết bị cảm biến môi trường tủ trữ mẫu và kho bảo quản
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
                                                    <span className="d-inline-flex align-items-center gap-1" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px' }}>
                                                        <Thermometer size={12} /> Nhiệt Độ (°C)
                                                    </span>
                                                ) : (
                                                    <span className="d-inline-flex align-items-center gap-1" style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px' }}>
                                                        <Droplets size={12} /> Độ Ẩm (%)
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    disabled={!isManager}
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
                                                    disabled={!isManager}
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
                                                    disabled={!isManager}
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

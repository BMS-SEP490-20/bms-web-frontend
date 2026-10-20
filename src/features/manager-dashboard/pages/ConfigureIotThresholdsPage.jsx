import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchIotThresholdsSummary,
    batchUpdateIotThresholds,
    resetDefaultIotThresholds,
    addAlertRecipient,
    removeAlertRecipient
} from '../api/iotThresholdApi';

/**
 * UC67 — Configure IoT Thresholds
 * Manager console environmental sensor threshold configuration & alarm management.
 * Strictly adheres to docs-output/screens/06-manager.html#uc67 and AGENTS.md rules.
 */
export default function ConfigureIotThresholdsPage() {
    const navigate = useNavigate();

    const [thresholds, setThresholds] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [escalationPolicy, setEscalationPolicy] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Modal state for adding a recipient
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecipient, setNewRecipient] = useState({
        fullName: '',
        role: 'Lab Technician',
        email: '',
        phone: '',
        channels: ['Push', 'Email']
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const data = await fetchIotThresholdsSummary();
            if (data) {
                setThresholds(data.thresholds || []);
                setRecipients(data.recipients || []);
                setEscalationPolicy(data.escalationPolicy || '');
            }
        } catch (err) {
            console.error('Error loading IoT thresholds:', err);
            setErrorMessage('Unable to load IoT threshold configurations from server.');
        } finally {
            setLoading(false);
        }
    };

    const handleThresholdChange = (deviceId, field, value) => {
        setThresholds(prev => prev.map(item => {
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
            const payload = thresholds.map(t => ({
                deviceId: t.deviceId,
                lowAlert: t.lowAlert,
                highAlert: t.highAlert,
                intervalSeconds: t.intervalSeconds
            }));

            const result = await batchUpdateIotThresholds(payload);
            if (result) {
                setThresholds(result.thresholds || thresholds);
                setSuccessMessage('All 10 device thresholds and telemetry intervals have been saved successfully.');
                setTimeout(() => setSuccessMessage(''), 4000);
            }
        } catch (err) {
            console.error('Error saving thresholds:', err);
            setErrorMessage('Failed to save threshold updates. Please verify boundary limits.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = async () => {
        if (!window.confirm('Are you sure you want to restore all IoT alert thresholds to standard regulatory defaults?')) {
            return;
        }

        setResetting(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await resetDefaultIotThresholds();
            if (result) {
                setThresholds(result.thresholds || []);
                setSuccessMessage('Thresholds restored to standard laboratory cold-chain defaults.');
                setTimeout(() => setSuccessMessage(''), 4000);
            }
        } catch (err) {
            console.error('Error resetting defaults:', err);
            setErrorMessage('Failed to reset default thresholds.');
        } finally {
            setResetting(false);
        }
    };

    const handleRemoveRecipient = async (recipientId) => {
        try {
            const ok = await removeAlertRecipient(recipientId);
            if (ok) {
                setRecipients(prev => prev.filter(r => r.id !== recipientId));
                setSuccessMessage('Alert recipient removed.');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            console.error('Error removing recipient:', err);
            setErrorMessage('Could not remove recipient.');
        }
    };

    const handleAddRecipientSubmit = async (e) => {
        e.preventDefault();
        if (!newRecipient.fullName.trim()) return;

        try {
            const added = await addAlertRecipient(newRecipient);
            if (added) {
                setRecipients(prev => [...prev, added]);
                setShowAddModal(false);
                setNewRecipient({ fullName: '', role: 'Lab Technician', email: '', phone: '', channels: ['Push', 'Email'] });
                setSuccessMessage(`Recipient '${added.fullName}' added to escalation chain.`);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            console.error('Error adding recipient:', err);
            setErrorMessage('Failed to add recipient.');
        }
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
            {/* Page Header matching 06-manager.html#uc67 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/manager/dashboard')}>Monitoring</span>
                        <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/manager/iot')}>IoT dashboard</span>
                        <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>Thresholds</span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Configure IoT thresholds</h1>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Set alert boundaries for each device</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        style={{ fontSize: '13px', fontWeight: '600', padding: '8px 16px', borderRadius: '6px' }}
                        onClick={handleResetDefaults}
                        disabled={resetting}
                    >
                        {resetting ? 'Resetting...' : 'Reset defaults'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: '#6929c4', borderColor: '#6929c4', fontSize: '13px', fontWeight: '600', padding: '8px 18px', borderRadius: '6px' }}
                        onClick={handleSaveAll}
                        disabled={saving}
                    >
                        <i className="bi bi-save me-1"></i> {saving ? 'Saving...' : 'Save all'}
                    </button>
                </div>
            </div>

            {/* Notification Banners */}
            {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center mb-3" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
                    <i className="bi bi-exclamation-octagon-fill me-2"></i>
                    <div>{errorMessage}</div>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success d-flex align-items-center mb-3" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <div>{successMessage}</div>
                </div>
            )}

            {/* Card 1: Threshold configuration Table */}
            <div className="card shadow-sm mb-4" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Threshold configuration</h3>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>{thresholds.length} devices · {thresholds.length} rules</span>
                </div>

                {loading ? (
                    <div className="p-5 text-center text-muted">
                        <div className="spinner-border text-primary" role="status"></div>
                        <div className="mt-2" style={{ fontSize: '13px' }}>Loading IoT device thresholds...</div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table align-middle mb-0" style={{ fontSize: '12.5px' }}>
                            <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '12px' }}>
                                <tr>
                                    <th style={{ paddingLeft: '20px' }}>Device</th>
                                    <th>Location</th>
                                    <th>Type</th>
                                    <th style={{ textAlign: 'right' }}>Low alert</th>
                                    <th style={{ textAlign: 'right' }}>High alert</th>
                                    <th style={{ textAlign: 'center' }}>Interval (s)</th>
                                    <th style={{ paddingRight: '20px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {thresholds.map((device) => {
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
                                                        <i className="bi bi-thermometer-half me-1"></i> Temp
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px' }}>
                                                        <i className="bi bi-moisture me-1"></i> Humidity
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    className="form-control d-inline-block text-end"
                                                    style={{ width: '75px', height: '30px', fontSize: '12px', padding: '2px 6px' }}
                                                    value={device.lowAlert}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'lowAlert', e.target.value)}
                                                /> {device.unit}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    className="form-control d-inline-block text-end"
                                                    style={{ width: '75px', height: '30px', fontSize: '12px', padding: '2px 6px' }}
                                                    value={device.highAlert}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'highAlert', e.target.value)}
                                                /> {device.unit}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    step="10"
                                                    className="form-control d-inline-block text-center"
                                                    style={{ width: '65px', height: '30px', fontSize: '12px', padding: '2px 6px' }}
                                                    value={device.intervalSeconds}
                                                    onChange={(e) => handleThresholdChange(device.deviceId, 'intervalSeconds', e.target.value)}
                                                />
                                            </td>
                                            <td style={{ paddingRight: '20px' }}>
                                                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                                                    ● {device.status || 'Active'}
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

            {/* Card 2: Alert recipients */}
            <div className="card shadow-sm" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Alert recipients</h3>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        style={{ fontSize: '12.5px', fontWeight: '600' }}
                        onClick={() => setShowAddModal(true)}
                    >
                        <i className="bi bi-plus-lg me-1"></i> Add recipient
                    </button>
                </div>
                <div className="card-body p-4">
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        {recipients.map((rec) => (
                            <div
                                key={rec.id}
                                style={{
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '16px',
                                    padding: '6px 12px',
                                    fontSize: '12.5px',
                                    fontWeight: '500',
                                    color: '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <i className="bi bi-person-fill text-primary"></i>
                                <span>{rec.fullName} ({rec.role})</span>
                                <i
                                    className="bi bi-x-circle-fill text-muted ms-1"
                                    style={{ cursor: 'pointer', fontSize: '13px' }}
                                    onClick={() => handleRemoveRecipient(rec.id)}
                                ></i>
                            </div>
                        ))}
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px', fontSize: '12.5px', color: '#1e40af' }}>
                        <i className="bi bi-info-circle-fill me-2"></i>
                        <span>{escalationPolicy || 'Alert channels: Push notification (FCM) + Email. SMS escalation after 5 min if not acknowledged.'}</span>
                    </div>
                </div>
            </div>

            {/* Add Recipient Modal */}
            {showAddModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '10px' }}>
                            <div className="modal-header">
                                <h5 className="modal-title" style={{ fontSize: '16px', fontWeight: '700' }}>Add Alert Recipient</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                            </div>
                            <form onSubmit={handleAddRecipientSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Full Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            value={newRecipient.fullName}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, fullName: e.target.value })}
                                            placeholder="e.g. Nguyễn Văn Khoa"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Role / Title</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            value={newRecipient.role}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                                            placeholder="e.g. Cold storage lead"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={newRecipient.email}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                                            placeholder="user@bms.health"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Phone (SMS escalation)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newRecipient.phone}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                                            placeholder="+84 901 ..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#6929c4', borderColor: '#6929c4' }}>Add Recipient</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

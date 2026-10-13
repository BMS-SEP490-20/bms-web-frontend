/**
 * @file TestCriterionFormModal.jsx
 * @description Modal component for creating and editing laboratory test criteria (UC18).
 * Features structured 3-section layout, ISO 15189 reference ranges and clinical panic boundaries.
 */

import React, { useState, useEffect } from 'react';

const CATEGORIES = [
  { value: 'Biochemistry', label: 'Sinh hóa máu (Biochemistry)' },
  { value: 'Hematology', label: 'Huyết học (Hematology)' },
  { value: 'Immunology', label: 'Miễn dịch học (Immunology)' },
  { value: 'BloodGas', label: 'Khí máu & Điện giải (Blood Gas)' },
  { value: 'Coagulation', label: 'Đông máu (Coagulation)' },
];

const COMMON_UNITS = [
  'mmol/L',
  'mg/dL',
  'umol/L',
  'g/L',
  'U/L',
  '%',
  'G/L',
  'T/L',
  'fL',
  'pg',
  'mEq/L',
];

export default function TestCriterionFormModal({ isOpen, mode = 'create', criterion = null, onClose, onSave }) {
  const [formData, setFormData] = useState({
    criterionCode: '',
    criterionName: '',
    englishName: '',
    category: 'Biochemistry',
    unit: 'mmol/L',
    valueType: 'Numeric',
    normalMin: '',
    normalMax: '',
    normalText: '',
    panicLow: '',
    panicHigh: '',
    isActive: true,
  });

  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (criterion && mode === 'edit') {
      setFormData({
        criterionCode: criterion.criterionCode || '',
        criterionName: criterion.criterionName || '',
        englishName: criterion.englishName || '',
        category: criterion.category || 'Biochemistry',
        unit: criterion.unit || 'mmol/L',
        valueType: criterion.valueType || 'Numeric',
        normalMin: criterion.normalMin !== null && criterion.normalMin !== undefined ? criterion.normalMin : '',
        normalMax: criterion.normalMax !== null && criterion.normalMax !== undefined ? criterion.normalMax : '',
        normalText: criterion.normalText || '',
        panicLow: criterion.panicLow !== null && criterion.panicLow !== undefined ? criterion.panicLow : '',
        panicHigh: criterion.panicHigh !== null && criterion.panicHigh !== undefined ? criterion.panicHigh : '',
        isActive: criterion.isActive !== undefined ? criterion.isActive : true,
      });
    } else {
      setFormData({
        criterionCode: '',
        criterionName: '',
        englishName: '',
        category: 'Biochemistry',
        unit: 'mmol/L',
        valueType: 'Numeric',
        normalMin: '',
        normalMax: '',
        normalText: '',
        panicLow: '',
        panicHigh: '',
        isActive: true,
      });
    }
    setValidationError('');
  }, [criterion, mode, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Field level validations
    if (!formData.criterionCode.trim()) {
      setValidationError('Vui lòng nhập Mã chỉ số xét nghiệm (ví dụ: GLU, HBA1C).');
      return;
    }
    if (!formData.criterionName.trim()) {
      setValidationError('Vui lòng nhập Tên chỉ số xét nghiệm tiếng Việt.');
      return;
    }

    // Clinical numeric range validations
    if (formData.valueType === 'Numeric') {
      const min = formData.normalMin !== '' ? parseFloat(formData.normalMin) : null;
      const max = formData.normalMax !== '' ? parseFloat(formData.normalMax) : null;
      const pLow = formData.panicLow !== '' ? parseFloat(formData.panicLow) : null;
      const pHigh = formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null;

      if (min !== null && max !== null && min > max) {
        setValidationError(`Giới hạn bình thường không hợp lệ: Giá trị Min (${min}) không được lớn hơn Max (${max}).`);
        return;
      }

      if (pLow !== null && min !== null && pLow > min) {
        setValidationError(`Ngưỡng nguy kịch dưới (${pLow}) không được vượt quá cận dưới bình thường (${min}).`);
        return;
      }

      if (pHigh !== null && max !== null && pHigh < max) {
        setValidationError(`Ngưỡng nguy kịch trên (${pHigh}) không được thấp hơn cận trên bình thường (${max}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        criterionCode: formData.criterionCode.trim().toUpperCase(),
        criterionName: formData.criterionName.trim(),
        englishName: formData.englishName ? formData.englishName.trim() : '',
        category: formData.category,
        unit: formData.unit ? formData.unit.trim() : '',
        valueType: formData.valueType,
        normalMin: formData.valueType === 'Numeric' && formData.normalMin !== '' ? parseFloat(formData.normalMin) : null,
        normalMax: formData.valueType === 'Numeric' && formData.normalMax !== '' ? parseFloat(formData.normalMax) : null,
        normalText: formData.valueType === 'Qualitative' ? formData.normalText.trim() : null,
        panicLow: formData.valueType === 'Numeric' && formData.panicLow !== '' ? parseFloat(formData.panicLow) : null,
        panicHigh: formData.valueType === 'Numeric' && formData.panicHigh !== '' ? parseFloat(formData.panicHigh) : null,
        isActive: formData.isActive,
      };

      await onSave(payload);
    } catch (err) {
      setValidationError(err.message || 'Lỗi khi lưu chỉ số xét nghiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bms-modal-backdrop" onClick={onClose}>
      <div
        className="bms-modal-container"
        style={{ maxWidth: '850px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bms-modal-header">
          <div>
            <h3 className="bms-modal-title">
              {mode === 'create' ? 'Thêm Mới Chỉ Số Xét Nghiệm (ISO 15189)' : `Chỉnh Sửa Chỉ Số: ${formData.criterionCode}`}
            </h3>
            <p className="bms-modal-subtitle">
              Định nghĩa mã danh pháp, đơn vị đo, dải tham chiếu sinh học WHO/ADA và ngưỡng báo động đỏ Panic Alert.
            </p>
          </div>
          <button type="button" className="bms-modal-close-btn" onClick={onClose} aria-label="Đóng">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bms-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {validationError && (
              <div className="bms-alert-danger" style={{ marginBottom: '16px' }}>
                <span className="bms-alert-icon">&#9888;</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Section 1: Identification */}
            <div className="bms-form-section">
              <h4 className="bms-form-section-title">1. Thông Tin Định Danh Y Tế</h4>
              <div className="bms-form-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="bms-form-group">
                  <label className="bms-form-label">
                    Mã chỉ số (Code) <span className="bms-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="criterionCode"
                    value={formData.criterionCode}
                    onChange={handleChange}
                    disabled={mode === 'edit'}
                    placeholder="VD: GLU, WBC"
                    maxLength={20}
                    className="bms-form-input"
                    style={{ textTransform: 'uppercase', fontWeight: 600 }}
                  />
                  <span className="bms-form-hint">Mã viết tắt chuẩn y khoa quốc tế</span>
                </div>

                <div className="bms-form-group">
                  <label className="bms-form-label">
                    Tên chỉ số (Tiếng Việt) <span className="bms-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="criterionName"
                    value={formData.criterionName}
                    onChange={handleChange}
                    placeholder="VD: Glucose máu lúc đói"
                    maxLength={150}
                    className="bms-form-input"
                  />
                </div>
              </div>

              <div className="bms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                <div className="bms-form-group">
                  <label className="bms-form-label">Danh pháp quốc tế (English Name)</label>
                  <input
                    type="text"
                    name="englishName"
                    value={formData.englishName}
                    onChange={handleChange}
                    placeholder="VD: Fasting Blood Glucose"
                    maxLength={150}
                    className="bms-form-input"
                  />
                </div>

                <div className="bms-form-group">
                  <label className="bms-form-label">
                    Chuyên khoa phân loại <span className="bms-required">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="bms-form-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Units & Value Type */}
            <div className="bms-form-section" style={{ marginTop: '20px' }}>
              <h4 className="bms-form-section-title">2. Đơn Vị Đo & Kiểu Dữ Liệu</h4>
              <div className="bms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="bms-form-group">
                  <label className="bms-form-label">Kiểu giá trị đo</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="valueType"
                        value="Numeric"
                        checked={formData.valueType === 'Numeric'}
                        onChange={handleChange}
                      />
                      <span>Định lượng (Numeric / Số thực)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="valueType"
                        value="Qualitative"
                        checked={formData.valueType === 'Qualitative'}
                        onChange={handleChange}
                      />
                      <span>Định tính (Qualitative)</span>
                    </label>
                  </div>
                </div>

                <div className="bms-form-group">
                  <label className="bms-form-label">Đơn vị đo lường (Unit)</label>
                  <input
                    type="text"
                    name="unit"
                    list="common-units-list"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="VD: mmol/L, mg/dL, %"
                    className="bms-form-input"
                  />
                  <datalist id="common-units-list">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Section 3: Reference Ranges & Panic Limits */}
            <div className="bms-form-section" style={{ marginTop: '20px' }}>
              <h4 className="bms-form-section-title">3. Dải Tham Chiếu Sinh Học & Báo Động Nguy Kịch (Panic Alert)</h4>

              {formData.valueType === 'Numeric' ? (
                <>
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>&#10003; Dải giá trị sinh học bình thường (Normal Range)</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>(Căn phải số liệu theo AGENTS-DESIGN.md)</span>
                    </div>
                    <div className="bms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="bms-form-group">
                        <label className="bms-form-label">Cận dưới bình thường (Min)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="normalMin"
                          value={formData.normalMin}
                          onChange={handleChange}
                          placeholder="3.9"
                          className="bms-form-input"
                          style={{ textAlign: 'right', fontWeight: 500 }}
                        />
                      </div>
                      <div className="bms-form-group">
                        <label className="bms-form-label">Cận trên bình thường (Max)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="normalMax"
                          value={formData.normalMax}
                          onChange={handleChange}
                          placeholder="6.4"
                          className="bms-form-input"
                          style={{ textAlign: 'right', fontWeight: 500 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>&#9888; Ngưỡng báo động đỏ nguy kịch (Panic Alert Range)</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>(Kích hoạt báo động khẩn cấp khi kết quả vượt ngưỡng)</span>
                    </div>
                    <div className="bms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="bms-form-group">
                        <label className="bms-form-label" style={{ color: '#b91c1c' }}>
                          Nguy kịch dưới (&lt; Panic Low)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="panicLow"
                          value={formData.panicLow}
                          onChange={handleChange}
                          placeholder="VD: 2.2"
                          className="bms-form-input"
                          style={{ textAlign: 'right', borderColor: '#fca5a5', fontWeight: 600, color: '#dc2626' }}
                        />
                      </div>
                      <div className="bms-form-group">
                        <label className="bms-form-label" style={{ color: '#b91c1c' }}>
                          Nguy kịch trên (&gt; Panic High)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          name="panicHigh"
                          value={formData.panicHigh}
                          onChange={handleChange}
                          placeholder="VD: 25.0"
                          className="bms-form-input"
                          style={{ textAlign: 'right', borderColor: '#fca5a5', fontWeight: 600, color: '#dc2626' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bms-form-group">
                  <label className="bms-form-label">Giá trị bình thường chuẩn định tính</label>
                  <input
                    type="text"
                    name="normalText"
                    value={formData.normalText}
                    onChange={handleChange}
                    placeholder="VD: Âm tính (Negative) / Không phản ứng"
                    className="bms-form-input"
                  />
                </div>
              )}
            </div>

            {/* Active switch */}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="isActiveCriterion"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="isActiveCriterion" style={{ fontWeight: 500, cursor: 'pointer', color: '#1e293b' }}>
                Áp dụng chỉ số này vào các dịch vụ xét nghiệm (Đang hoạt động)
              </label>
            </div>
          </div>

          <div className="bms-modal-footer">
            <button type="button" className="bms-btn bms-btn-outline" onClick={onClose} disabled={isSubmitting}>
              Hủy Bỏ
            </button>
            <button type="submit" className="bms-btn bms-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="bms-spinner-small" /> Đang Lưu...
                </>
              ) : mode === 'create' ? (
                'Tạo Mới Chỉ Số'
              ) : (
                'Lưu Thay Đổi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

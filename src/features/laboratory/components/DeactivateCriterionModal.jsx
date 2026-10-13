/**
 * @file DeactivateCriterionModal.jsx
 * @description Confirmation modal for safely deactivating / soft-deleting laboratory criteria (UC18).
 * Enforces ISO 15189 compliance by preventing permanent deletion of historical clinical records.
 */

import React, { useState } from 'react';

export default function DeactivateCriterionModal({ isOpen, criterion, onClose, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !criterion) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onConfirm(criterion.id);
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi vô hiệu hóa chỉ số xét nghiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bms-modal-backdrop" onClick={onClose}>
      <div
        className="bms-modal-container"
        style={{ maxWidth: '520px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bms-modal-header" style={{ borderBottomColor: '#fecaca', background: '#fef2f2' }}>
          <div>
            <h3 className="bms-modal-title" style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>&#9888;</span> Ngưng Sử Dụng Chỉ Số Xét Nghiệm
            </h3>
            <p className="bms-modal-subtitle" style={{ color: '#b91c1c' }}>
              Bảo toàn lịch sử hồ sơ bệnh án theo tiêu chuẩn ISO 15189:2022
            </p>
          </div>
          <button type="button" className="bms-modal-close-btn" onClick={onClose} aria-label="Đóng">
            &times;
          </button>
        </div>

        <div className="bms-modal-body">
          {errorMessage && (
            <div className="bms-alert-danger" style={{ marginBottom: '14px' }}>
              <span>&#9888; {errorMessage}</span>
            </div>
          )}

          <div
            style={{
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b' }}>Chỉ số được chọn:</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              [{criterion.criterionCode}] {criterion.criterionName}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Chuyên khoa: {criterion.category} | Đơn vị: {criterion.unit || 'N/A'}
            </div>
          </div>

          <div style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 10px 0' }}>
              <strong>Lưu ý quan trọng:</strong> Hệ thống thực hiện <em>Vô hiệu hóa an toàn (Soft Deactivation)</em>,
              tuyệt đối không xóa cứng khỏi cơ sở dữ liệu.
            </p>
            <ul style={{ paddingLeft: '20px', margin: '0', color: '#64748b', fontSize: '13px' }}>
              <li>Ẩn chỉ số khỏi danh sách tạo phiếu chỉ định và gói xét nghiệm mới.</li>
              <li>Toàn bộ kết quả xét nghiệm lịch sử và báo cáo bệnh án cũ vẫn được bảo lưu nguyên vẹn.</li>
            </ul>
          </div>
        </div>

        <div className="bms-modal-footer">
          <button type="button" className="bms-btn bms-btn-outline" onClick={onClose} disabled={isSubmitting}>
            Hủy Bỏ
          </button>
          <button
            type="button"
            className="bms-btn bms-btn-danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{ background: '#dc2626', color: '#fff', border: 'none' }}
          >
            {isSubmitting ? (
              <>
                <span className="bms-spinner-small" /> Đang Xử Lý...
              </>
            ) : (
              'Xác Nhận Ngưng Dùng'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

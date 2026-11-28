import React, { useEffect, useState } from 'react';
import { ProgressBar, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Reply, Star } from 'lucide-react';
import { patientFeedbackService } from '../../../services/patientFeedbackService';
import { ROLES, getStoredUser, resolveRoleId } from '../../../constants/roles';

function StarRow({ rating = 5, size = 12 }) {
  return (
    <span className="d-inline-flex align-items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= rating ? '#F59E0B' : 'none'}
          color={s <= rating ? '#F59E0B' : '#CBD5E1'}
        />
      ))}
    </span>
  );
}

/**
 * Renders live anonymized patient reviews and rating distribution inside the package detail modal.
 */
export default function PackageReviewsSection({ pkg, onCloseModal }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const user = getStoredUser();
  const isPatient = resolveRoleId(user) === ROLES.PATIENT;
  const packageKey = pkg?.id || pkg?.packageCode || pkg?.code;

  useEffect(() => {
    let active = true;
    if (!packageKey) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    patientFeedbackService
      .getPackageFeedback(packageKey)
      .then((res) => {
        if (active) setDetail(res.success ? res.data : null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [packageKey]);

  const summary = detail?.summary;
  const reviews = Array.isArray(detail?.reviews) ? detail.reviews : [];
  const totalReviews = Number(summary?.totalReviews || 0);
  const averageRating = Number(summary?.averageRating || 0);

  const handleWriteFeedback = () => {
    if (onCloseModal) onCloseModal();
    const q = new URLSearchParams();
    if (pkg?.id) q.set('packageId', pkg.id);
    if (pkg?.packageCode) q.set('packageCode', pkg.packageCode);
    navigate(`/feedback?${q.toString()}`);
  };

  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <MessageSquare size={15} color="#1E60E6" />
          <h5 className="fw-bold m-0" style={{ fontSize: '14px', color: '#0F172A' }}>
            Đánh Giá Từ Bệnh Nhân Đã Sử Dụng Gói ({totalReviews})
          </h5>
        </div>

        {isPatient && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleWriteFeedback}
            style={{
              backgroundColor: '#EFF6FF',
              color: '#1E60E6',
              border: '1px solid #BFDBFE',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 650,
              padding: '4px 12px'
            }}
          >
            Viết đánh giá cho gói này
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-3 text-muted small">
          <Spinner animation="border" size="sm" variant="primary" className="me-2" />
          Đang tải đánh giá của gói dịch vụ...
        </div>
      ) : totalReviews === 0 ? (
        <div
          className="p-3 rounded-3 text-center"
          style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', fontSize: '12.5px', color: '#64748B' }}
        >
          Chưa có đánh giá nào cho gói xét nghiệm này. Bệnh nhân sau khi hoàn tất xét nghiệm có thể gửi đánh giá tại mục <strong>Phản hồi dịch vụ</strong>.
        </div>
      ) : (
        <div>

          <div
            className="p-3 rounded-3 mb-3 d-flex flex-column flex-md-row align-items-md-center gap-3"
            style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div className="text-center px-md-3" style={{ minWidth: '130px' }}>
              <div className="fw-bold tabular-nums" style={{ fontSize: '28px', color: '#0F172A', lineHeight: 1.1 }}>
                {averageRating.toFixed(1)}
                <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}> / 5</span>
              </div>
              <div className="my-1">
                <StarRow rating={Math.round(averageRating)} size={13} />
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>{totalReviews} lượt đánh giá</div>
            </div>

            <div className="flex-grow-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(summary?.ratingDistribution?.[star] || 0);
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '11.5px' }}>
                    <span className="fw-semibold text-dark d-inline-flex align-items-center gap-1" style={{ width: '36px' }}>
                      {star} <Star size={10} fill="#F59E0B" color="#F59E0B" />
                    </span>
                    <div className="flex-grow-1">
                      <ProgressBar
                        now={pct}
                        variant={star >= 4 ? 'warning' : star === 3 ? 'info' : 'secondary'}
                        style={{ height: '6px' }}
                        className="rounded-pill"
                      />
                    </div>
                    <span className="text-muted text-end tabular-nums" style={{ width: '28px' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="d-flex flex-column gap-2.5" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {reviews.map((rev) => (
              <div
                key={rev.feedbackId}
                className="p-3 rounded-3"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <strong style={{ fontSize: '12.5px', color: '#0F172A' }}>{rev.displayAuthorName}</strong>
                    <StarRow rating={rev.rating} size={11} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
                <div className="fw-semibold" style={{ fontSize: '12.5px', color: '#1E293B', marginBottom: '2px' }}>
                  {rev.title}
                </div>
                <p className="m-0" style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
                  {rev.comment}
                </p>

                {rev.managerResponse && (
                  <div
                    className="mt-2 p-2 rounded-2"
                    style={{ backgroundColor: '#EFF6FF', borderLeft: '3px solid #1E60E6', fontSize: '11.5px' }}
                  >
                    <div className="fw-bold text-primary d-flex align-items-center gap-1 mb-0.5">
                      <Reply size={11} />
                      <span>Phản hồi từ {rev.respondedBy || 'Ban Quản Lý BMS'}:</span>
                    </div>
                    <div style={{ color: '#1E293B' }}>{rev.managerResponse}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

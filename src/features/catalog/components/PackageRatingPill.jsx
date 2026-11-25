import React from 'react';
import { Star } from 'lucide-react';

/**
 * Compact flat rating pill displayed on public package cards/rows.
 */
export default function PackageRatingPill({ ratingSummary, compact = false }) {
  const total = Number(ratingSummary?.totalReviews || 0);
  const avg = Number(ratingSummary?.averageRating || 0);

  if (total <= 0) {
    return (
      <span
        className="d-inline-flex align-items-center gap-1"
        style={{
          fontSize: compact ? '11px' : '11.5px',
          fontWeight: 600,
          color: '#64748B',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          padding: compact ? '2px 8px' : '3px 9px',
          borderRadius: '9999px',
          whiteSpace: 'nowrap'
        }}
      >
        <Star size={11} className="text-muted" />
        <span>Chưa có đánh giá</span>
      </span>
    );
  }

  return (
    <span
      className="d-inline-flex align-items-center gap-1 tabular-nums"
      style={{
        fontSize: compact ? '11px' : '11.5px',
        fontWeight: 700,
        color: '#92400E',
        backgroundColor: '#FEF3C7',
        border: '1px solid #FDE68A',
        padding: compact ? '2px 8px' : '3px 9px',
        borderRadius: '9999px',
        whiteSpace: 'nowrap'
      }}
      title={`Điểm trung bình ${avg.toFixed(1)}/5 từ ${total} lượt đánh giá`}
    >
      <Star size={11} fill="#F59E0B" color="#F59E0B" />
      <span>{avg.toFixed(1)}</span>
      <span style={{ fontWeight: 600, color: '#B45309' }}>({total} đánh giá)</span>
    </span>
  );
}

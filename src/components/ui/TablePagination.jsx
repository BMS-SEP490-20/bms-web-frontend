import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Reusable client-side pagination hook for table & list views across BMS.
 * Automatically clamps current page when filters reduce the list length.
 */
export function usePagination(items, defaultPageSize = 10) {
  const list = Array.isArray(items) ? items : [];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, safePage, pageSize]);

  const handlePageSizeChange = (nextSize) => {
    const parsed = Number(nextSize) || defaultPageSize;
    setPageSize(parsed);
    setPage(1);
  };

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalItems,
    totalPages,
    paginatedItems,
    startIndex: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
    endIndex: Math.min(safePage * pageSize, totalItems),
  };
}

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push('ellipsis-left');
  for (let p = left; p <= right; p += 1) {
    pages.push(p);
  }
  if (right < totalPages - 1) pages.push('ellipsis-right');
  pages.push(totalPages);
  return pages;
}

/**
 * Unified clinical-grade table/list pagination footer matching BMS Soft Medical UI.
 * Supports both client-side (via usePagination) and server-side pagination.
 */
export default function TablePagination({
  page = 1,
  totalPages: totalPagesProp,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = 'mục',
  compact = false,
  className = '',
}) {
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(
    1,
    Number(totalPagesProp) || Math.ceil(safeTotalItems / safePageSize)
  );
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  if (safeTotalItems === 0) return null;

  const startItem = (safePage - 1) * safePageSize + 1;
  const endItem = Math.min(safePage * safePageSize, safeTotalItems);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  const btnBase = {
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#334155',
    borderRadius: '8px',
    fontSize: compact ? '0.78rem' : '0.82rem',
    fontWeight: 600,
    minWidth: compact ? '30px' : '34px',
    height: compact ? '30px' : '34px',
    padding: compact ? '0 8px' : '0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  return (
    <div
      className={`d-flex flex-wrap align-items-center justify-content-between gap-2 ${className}`}
      style={{
        padding: compact ? '10px 14px' : '12px 18px',
        borderTop: '1px solid #EEF2F6',
        background: '#FAFBFD',
        borderBottomLeftRadius: 'inherit',
        borderBottomRightRadius: 'inherit',
      }}
    >
      <div className="d-flex flex-wrap align-items-center gap-2 text-muted" style={{ fontSize: compact ? '0.78rem' : '0.83rem' }}>
        <span>
          Hiển thị <strong style={{ color: '#0F172A' }}>{startItem}–{endItem}</strong> /{' '}
          <strong style={{ color: '#0F172A' }}>{safeTotalItems}</strong> {itemLabel}
        </span>
        <span style={{ color: '#CBD5E1' }}>·</span>
        <span>
          Trang <strong style={{ color: '#0F172A' }}>{safePage}</strong>/{totalPages}
        </span>
        {onPageSizeChange && (
          <div className="d-inline-flex align-items-center gap-1 ms-1">
            <select
              aria-label="Số dòng mỗi trang"
              value={safePageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: compact ? '0.76rem' : '0.8rem',
                fontWeight: 600,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <nav aria-label="Phân trang danh sách" className="d-flex align-items-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange && onPageChange(safePage - 1)}
          style={{
            ...btnBase,
            opacity: safePage <= 1 ? 0.45 : 1,
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={14} />
          <span>Trước</span>
        </button>

        {pageNumbers.map((item) =>
          typeof item === 'string' ? (
            <span
              key={item}
              style={{
                padding: '0 6px',
                color: '#94A3B8',
                fontSize: '0.82rem',
                userSelect: 'none',
              }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange && onPageChange(item)}
              aria-current={item === safePage ? 'page' : undefined}
              style={{
                ...btnBase,
                background: item === safePage ? '#1E60E6' : '#FFFFFF',
                color: item === safePage ? '#FFFFFF' : '#334155',
                borderColor: item === safePage ? '#1E60E6' : '#E2E8F0',
              }}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange && onPageChange(safePage + 1)}
          style={{
            ...btnBase,
            opacity: safePage >= totalPages ? 0.45 : 1,
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <span>Sau</span>
          <ChevronRight size={14} />
        </button>
      </nav>
    </div>
  );
}

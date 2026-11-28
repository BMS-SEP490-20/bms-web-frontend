/**
 * Renders a real, scannable CODE128 barcode SVG (via `jsbarcode`) on top
 * with the human-readable barcode number directly underneath.
 */
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function Code128Barcode({
  value,
  height = 42,
  width = 1.4,
  showText = true,
  compact = false,
  align = 'center',
  className = ''
}) {
  const svgRef = useRef(null);
  const text = String(value || '').trim();

  useEffect(() => {
    if (!svgRef.current || !text) return;
    try {
      JsBarcode(svgRef.current, text, {
        format: 'CODE128',
        displayValue: false,
        height: compact ? Math.min(height, 28) : height,
        width: compact ? Math.min(width, 1.05) : width,
        margin: compact ? 2 : 4,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
    } catch (err) {
      console.warn('Code128Barcode render failed:', err);
    }
  }, [text, height, width, compact]);

  if (!text) {
    return <div className="text-muted small">Chưa có mã</div>;
  }

  const alignClass =
    align === 'start'
      ? 'align-items-start text-start'
      : align === 'end'
        ? 'align-items-end text-end'
        : 'align-items-center text-center';

  return (
    <div className={`d-inline-flex flex-column ${alignClass} ${className}`}>
      <div
        className="bg-white rounded border"
        style={{
          padding: compact ? '2px 5px' : '4px 8px',
          borderColor: '#e2e8f0',
          lineHeight: 0,
          maxWidth: compact ? '195px' : '100%'
        }}
      >
        <svg
          ref={svgRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>
      {showText && (
        <span
          className="font-monospace fw-bold text-dark mt-1"
          style={{
            fontSize: compact ? '0.7rem' : '0.76rem',
            letterSpacing: '0.03em',
            lineHeight: 1.2,
            wordBreak: 'break-all'
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

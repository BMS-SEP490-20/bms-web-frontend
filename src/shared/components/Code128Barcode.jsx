/**
 * Renders a live Code 128 barcode into an SVG element.
 */
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function Code128Barcode({ value, height = 48, width = 1.6, className = '' }) {
  const svgRef = useRef(null);
  const text = String(value || '').trim();

  useEffect(() => {
    if (!svgRef.current || !text) return;
    try {
      JsBarcode(svgRef.current, text, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        height,
        width,
        margin: 4,
        textMargin: 4,
        background: '#ffffff',
        lineColor: '#000000'
      });
    } catch (err) {
      console.warn('Code128Barcode render failed:', err);
    }
  }, [text, height, width]);

  if (!text) {
    return <div className="text-muted small">Chưa có mã</div>;
  }

  return <svg ref={svgRef} className={className} style={{ maxWidth: '100%', height: 'auto' }} />;
}

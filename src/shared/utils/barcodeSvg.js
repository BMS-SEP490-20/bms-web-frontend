/**
 * Generate Code 128 barcode as SVG markup (for print labels).
 */
import JsBarcode from 'jsbarcode';

export function buildCode128Svg(value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return '';

  if (typeof document === 'undefined') return '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, text, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 12,
      height: options.height ?? 48,
      width: options.width ?? 1.6,
      margin: 4,
      textMargin: 4,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    });
  } catch (err) {
    console.warn('JsBarcode render failed:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64"><text x="8" y="36" font-size="12">${text}</text></svg>`;
  }
  return svg.outerHTML;
}

export function enrichLabelsWithSvg(labels) {
  const list = Array.isArray(labels) ? labels : [];
  return list.map((lbl) => {
    const code = lbl?.barcodeCode128 || lbl?.specimenId || lbl?.barcode || '';
    if (lbl?.svgBarcode && String(lbl.svgBarcode).includes('<svg')) {
      return lbl;
    }
    return {
      ...lbl,
      barcodeCode128: code,
      svgBarcode: buildCode128Svg(code)
    };
  });
}

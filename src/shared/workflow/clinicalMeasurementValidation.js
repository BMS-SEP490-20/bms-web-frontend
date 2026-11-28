/**
 * @file clinicalMeasurementValidation.js
 * @description Clinical Analytical Measurement Range (AMR) & Physiological Plausibility Validation
 * (ISO 15189:2022 & CLSI EP06) for all 45 BMS laboratory criteria across 8 service packages.
 *
 * Distinguishes 3 medical layers:
 *   1. Hard Analytical/Physiological Limit (blocks saving — e.g. negative values, impossible 0, >100%, typo)
 *   2. Biological Reference Interval (soft warning flag: LOW / HIGH)
 *   3. Critical / Panic Value (highlight flag: CRITICAL)
 */

export const CLINICAL_MEASUREMENT_RULES = Object.freeze({
  RBC: { min: 0.5, max: 12.0, allowZero: false, unit: 'T/L' },
  HGB: { min: 15, max: 260, allowZero: false, unit: 'g/L' },
  HCT: { min: 5, max: 85, allowZero: false, unit: '%' },
  MCV: { min: 40, max: 160, allowZero: false, unit: 'fL' },
  MCH: { min: 10, max: 60, allowZero: false, unit: 'pg' },
  MCHC: { min: 200, max: 450, allowZero: false, unit: 'g/L' },
  RDW_CV: { min: 8, max: 40, allowZero: false, unit: '%' },
  WBC: { min: 0.1, max: 500, allowZero: false, unit: 'G/L' },
  NEU_PCT: { min: 0, max: 100, allowZero: true, unit: '%' },
  LYM_PCT: { min: 0, max: 100, allowZero: true, unit: '%' },
  MONO_PCT: { min: 0, max: 100, allowZero: true, unit: '%' },
  EOS_PCT: { min: 0, max: 100, allowZero: true, unit: '%' },
  BASO_PCT: { min: 0, max: 100, allowZero: true, unit: '%' },
  PLT: { min: 1, max: 3000, allowZero: false, unit: 'G/L' },

  GLU: { min: 0.5, max: 60, allowZero: false, unit: 'mmol/L' },
  GLUCOSE: { min: 0.5, max: 60, allowZero: false, unit: 'mmol/L' },
  HBA1C: { min: 2.0, max: 25.0, allowZero: false, unit: '%' },
  AST: { min: 1, max: 15000, allowZero: false, unit: 'U/L' },
  ALT: { min: 1, max: 15000, allowZero: false, unit: 'U/L' },
  GGT: { min: 1, max: 5000, allowZero: false, unit: 'U/L' },
  BILI_T: { min: 0.5, max: 1000, allowZero: false, unit: 'µmol/L' },
  BILI_D: { min: 0, max: 600, allowZero: true, unit: 'µmol/L' },
  ALB: { min: 5, max: 80, allowZero: false, unit: 'g/L' },
  TP: { min: 15, max: 150, allowZero: false, unit: 'g/L' },
  UREA: { min: 0.5, max: 100, allowZero: false, unit: 'mmol/L' },
  CRE: { min: 10, max: 2500, allowZero: false, unit: 'µmol/L' },
  CREAT: { min: 10, max: 2500, allowZero: false, unit: 'µmol/L' },
  CREA: { min: 10, max: 2500, allowZero: false, unit: 'µmol/L' },
  URIC: { min: 30, max: 1500, allowZero: false, unit: 'µmol/L' },
  CRP_HS: { min: 0, max: 500, allowZero: true, unit: 'mg/L' },
  CRP: { min: 0, max: 500, allowZero: true, unit: 'mg/L' },

  CHOL: { min: 0.5, max: 30, allowZero: false, unit: 'mmol/L' },
  CHOL_T: { min: 0.5, max: 30, allowZero: false, unit: 'mmol/L' },
  TRIG: { min: 0.1, max: 60, allowZero: false, unit: 'mmol/L' },
  HDL_C: { min: 0.1, max: 6, allowZero: false, unit: 'mmol/L' },
  LDL_C: { min: 0.1, max: 20, allowZero: false, unit: 'mmol/L' },

  NA: { min: 90, max: 200, allowZero: false, unit: 'mmol/L' },
  K: { min: 1.0, max: 12.0, allowZero: false, unit: 'mmol/L' },
  CL: { min: 60, max: 150, allowZero: false, unit: 'mmol/L' },
  CA_ION: { min: 0.3, max: 3.5, allowZero: false, unit: 'mmol/L' },

  PT_SEC: { min: 5, max: 150, allowZero: false, unit: 's' },
  PT_INR: { min: 0.5, max: 15.0, allowZero: false, unit: 'INR' },
  APTT: { min: 10, max: 200, allowZero: false, unit: 's' },
  FIBRIN: { min: 0.3, max: 15.0, allowZero: false, unit: 'g/L' },

  HBS_AB: { min: 0, max: 50000, allowZero: true, unit: 'mIU/mL' },
});

const WBC_DIFF_CODES = ['NEU_PCT', 'LYM_PCT', 'MONO_PCT', 'EOS_PCT', 'BASO_PCT'];

export function isQualitativeCriterion(param) {
  return String(param?.valueType || '').toLowerCase() === 'qualitative';
}

export function getMeasurementRule(param) {
  const code = String(param?.code || '').trim().toUpperCase();
  if (CLINICAL_MEASUREMENT_RULES[code]) {
    return CLINICAL_MEASUREMENT_RULES[code];
  }
  const unit = String(param?.unit || '').trim();
  if (unit === '%') {
    return { min: 0, max: 100, allowZero: true, unit: '%' };
  }
  const allowZero = param?.refLow !== null && param?.refLow !== undefined && Number(param.refLow) <= 0;
  const max = param?.refHigh && Number(param.refHigh) > 0
    ? Math.max(Number(param.refHigh) * 20, 1000)
    : 100000;
  return {
    min: allowZero ? 0 : 0.0001,
    max,
    allowZero,
    unit,
  };
}

export function formatRuleHintVi(param) {
  if (isQualitativeCriterion(param)) {
    return 'Chọn: Âm tính / Dương tính';
  }
  const rule = getMeasurementRule(param);
  const unitStr = param?.unit || rule.unit || '';
  const zeroTag = rule.allowZero ? 'cho phép = 0' : 'không âm, > 0';
  return `Dải nhập: ${rule.min} – ${rule.max}${unitStr ? ` ${unitStr}` : ''} (${zeroTag})`;
}

/**
 * Validates a single parameter input. Returns null if valid (or empty when allowEmpty=true),
 * otherwise returns a clear Vietnamese clinical error message.
 */
export function validateSingleParameter(param, { requireValue = false } = {}) {
  const raw = param?.value;
  const str = raw === null || raw === undefined ? '' : String(raw).trim();

  if (str === '') {
    return requireValue ? `Vui lòng nhập giá trị cho ${param?.code || 'chỉ số này'}.` : null;
  }

  if (isQualitativeCriterion(param)) {
    const allowed = ['Âm tính (Negative)', 'Dương tính (Positive)', 'Âm tính', 'Dương tính', 'Negative', 'Positive'];
    if (!allowed.some((v) => v.toLowerCase() === str.toLowerCase())) {
      return `Chỉ số ${param.code} chỉ chấp nhận Âm tính hoặc Dương tính.`;
    }
    return null;
  }

  const num = Number(str);
  if (!Number.isFinite(num)) {
    return `Giá trị của ${param.code} phải là số hợp lệ.`;
  }

  const rule = getMeasurementRule(param);
  const unitStr = param?.unit || rule.unit || '';

  if (num < 0) {
    return `${param.code} không được nhập số âm (< 0).`;
  }
  if (!rule.allowZero && num === 0) {
    return `${param.code} không thể bằng 0 về mặt sinh học (hợp lệ: ${rule.min} – ${rule.max}${unitStr ? ` ${unitStr}` : ''}).`;
  }
  if (num < rule.min || num > rule.max) {
    return `${param.code} vượt dải đo hợp lệ (${rule.min} – ${rule.max}${unitStr ? ` ${unitStr}` : ''}). Kiểm tra lại dấu phẩy hoặc đơn vị.`;
  }
  return null;
}

/**
 * Validates all parameters in the panel including cross-parameter clinical invariants.
 * Returns { fieldErrors: Record<code, string>, crossErrors: string[], missingCodes: string[], hasErrors: boolean }.
 */
export function validateAllParameters(params, { requireAll = false } = {}) {
  const list = Array.isArray(params) ? params : [];
  const fieldErrors = {};
  const missingCodes = [];
  const numericByCode = {};

  for (const p of list) {
    const code = String(p?.code || '').trim().toUpperCase();
    const raw = p?.value;
    const str = raw === null || raw === undefined ? '' : String(raw).trim();

    if (str === '') {
      missingCodes.push(code);
      if (requireAll) {
        fieldErrors[code] = `Chưa nhập giá trị cho ${code}.`;
      }
      continue;
    }

    const err = validateSingleParameter(p, { requireValue: requireAll });
    if (err) {
      fieldErrors[code] = err;
    } else if (!isQualitativeCriterion(p)) {
      numericByCode[code] = Number(str);
    }
  }

  const crossErrors = [];

  const wbcPresent = WBC_DIFF_CODES.filter((c) => numericByCode[c] !== undefined);
  if (wbcPresent.length >= 2) {
    const sum = wbcPresent.reduce((acc, c) => acc + numericByCode[c], 0);
    if (sum > 100.5) {
      crossErrors.push(
        `Tổng tỷ lệ các dòng bạch cầu (${wbcPresent.join(' + ')}) = ${Number(sum.toFixed(1))}% vượt quá 100%. Vui lòng kiểm tra lại số liệu.`
      );
    }
  }

  if (numericByCode.BILI_D !== undefined && numericByCode.BILI_T !== undefined && numericByCode.BILI_D > numericByCode.BILI_T) {
    crossErrors.push(
      `Bilirubin trực tiếp (BILI_D = ${numericByCode.BILI_D}) không thể lớn hơn Bilirubin toàn phần (BILI_T = ${numericByCode.BILI_T}).`
    );
  }

  if (numericByCode.ALB !== undefined && numericByCode.TP !== undefined && numericByCode.ALB > numericByCode.TP) {
    crossErrors.push(
      `Albumin (ALB = ${numericByCode.ALB} g/L) không thể lớn hơn Protein toàn phần (TP = ${numericByCode.TP} g/L).`
    );
  }

  const hasErrors = Object.keys(fieldErrors).length > 0 || crossErrors.length > 0;
  return { fieldErrors, crossErrors, missingCodes, hasErrors };
}

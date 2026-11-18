/**
 * Nạp bảng nhập KQ theo y lệnh / gói catalog:
 * - Gói dịch vụ → toàn bộ criteria (thường 5–7 chỉ), mỗi chỉ có unit + khoảng TC riêng
 * - Chỉ số lẻ BS thêm → 1 dòng / chỉ số
 * Không seed cứng 1 panel CBC cho mọi ống.
 */
import { fetchServiceById, searchTestPackages } from '../../features/catalog/api/catalogApi';
import api from '../../config/api';

/** Thư viện khoảng TC / đơn vị khi catalog gói thiếu criteria map */
const CRITERIA_MEDICAL = {
  WBC: { code: 'WBC', name: 'Bạch cầu (WBC)', unit: 'G/L', refLow: 4.0, refHigh: 10.0, criticalLow: 1.5, criticalHigh: 30 },
  RBC: { code: 'RBC', name: 'Hồng cầu (RBC)', unit: 'T/L', refLow: 4.0, refHigh: 5.5, criticalLow: 2.0, criticalHigh: 7 },
  HGB: { code: 'HGB', name: 'Huyết sắc tố (HGB)', unit: 'g/L', refLow: 120, refHigh: 160, criticalLow: 70, criticalHigh: 200 },
  HCT: { code: 'HCT', name: 'Hematocrit (HCT)', unit: '%', refLow: 37, refHigh: 48, criticalLow: 20, criticalHigh: 60 },
  PLT: { code: 'PLT', name: 'Tiểu cầu (PLT)', unit: 'G/L', refLow: 150, refHigh: 450, criticalLow: 20, criticalHigh: 1000 },
  MCV: { code: 'MCV', name: 'MCV', unit: 'fL', refLow: 80, refHigh: 100 },
  MCH: { code: 'MCH', name: 'MCH', unit: 'pg', refLow: 27, refHigh: 32 },
  MCHC: { code: 'MCHC', name: 'MCHC', unit: 'g/L', refLow: 320, refHigh: 360 },
  RDW: { code: 'RDW', name: 'RDW', unit: '%', refLow: 11.5, refHigh: 14.5 },
  NEU: { code: 'NEU', name: 'Neutrophil %', unit: '%', refLow: 40, refHigh: 70 },
  LYM: { code: 'LYM', name: 'Lymphocyte %', unit: '%', refLow: 20, refHigh: 40 },
  MONO: { code: 'MONO', name: 'Monocyte %', unit: '%', refLow: 2, refHigh: 10 },
  EOS: { code: 'EOS', name: 'Eosinophil %', unit: '%', refLow: 1, refHigh: 6 },
  BASO: { code: 'BASO', name: 'Basophil %', unit: '%', refLow: 0, refHigh: 1 },
  GLU: { code: 'GLU', name: 'Glucose đói', unit: 'mmol/L', refLow: 3.9, refHigh: 5.6, criticalLow: 2.5, criticalHigh: 25 },
  GLUCOSE: { code: 'GLU', name: 'Glucose đói', unit: 'mmol/L', refLow: 3.9, refHigh: 5.6, criticalLow: 2.5, criticalHigh: 25 },
  UREA: { code: 'UREA', name: 'Ure máu', unit: 'mmol/L', refLow: 2.5, refHigh: 7.5 },
  CREA: { code: 'CREA', name: 'Creatinine', unit: 'µmol/L', refLow: 53, refHigh: 106 },
  CREATININE: { code: 'CREA', name: 'Creatinine', unit: 'µmol/L', refLow: 53, refHigh: 106 },
  AST: { code: 'AST', name: 'AST (GOT)', unit: 'U/L', refLow: 10, refHigh: 40 },
  ALT: { code: 'ALT', name: 'ALT (GPT)', unit: 'U/L', refLow: 10, refHigh: 40 },
  GGT: { code: 'GGT', name: 'GGT', unit: 'U/L', refLow: 8, refHigh: 61 },
  BILI: { code: 'BILI', name: 'Bilirubin toàn phần', unit: 'µmol/L', refLow: 3, refHigh: 17 },
  TP: { code: 'TP', name: 'Protein toàn phần', unit: 'g/L', refLow: 64, refHigh: 83 },
  ALB: { code: 'ALB', name: 'Albumin', unit: 'g/L', refLow: 35, refHigh: 50 },
  CHOL: { code: 'CHOL', name: 'Cholesterol toàn phần', unit: 'mmol/L', refLow: 0, refHigh: 5.2 },
  TRIG: { code: 'TRIG', name: 'Triglyceride', unit: 'mmol/L', refLow: 0, refHigh: 1.7 },
  HDL: { code: 'HDL', name: 'HDL-C', unit: 'mmol/L', refLow: 1.0, refHigh: 2.2 },
  LDL: { code: 'LDL', name: 'LDL-C', unit: 'mmol/L', refLow: 0, refHigh: 3.4 },
  NA: { code: 'NA', name: 'Natri (Na+)', unit: 'mmol/L', refLow: 135, refHigh: 145, criticalLow: 120, criticalHigh: 160 },
  K: { code: 'K', name: 'Kali (K+)', unit: 'mmol/L', refLow: 3.5, refHigh: 5.1, criticalLow: 2.5, criticalHigh: 6.5 },
  CL: { code: 'CL', name: 'Clo (Cl-)', unit: 'mmol/L', refLow: 98, refHigh: 107 },
  TSH: { code: 'TSH', name: 'TSH', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 },
  FT4: { code: 'FT4', name: 'Free T4', unit: 'pmol/L', refLow: 10, refHigh: 25 },
  FT3: { code: 'FT3', name: 'Free T3', unit: 'pmol/L', refLow: 3.1, refHigh: 6.8 },
  'ANTI-TPO': { code: 'ANTI-TPO', name: 'Kháng thể Anti-TPO', unit: 'IU/mL', refLow: 0, refHigh: 34 },
  ANTITPO: { code: 'ANTI-TPO', name: 'Kháng thể Anti-TPO', unit: 'IU/mL', refLow: 0, refHigh: 34 },
  TPO: { code: 'ANTI-TPO', name: 'Kháng thể Anti-TPO', unit: 'IU/mL', refLow: 0, refHigh: 34 },
  PT: { code: 'PT', name: 'Prothrombin Time (PT)', unit: 'giây', refLow: 11, refHigh: 13.5 },
  APTT: { code: 'APTT', name: 'APTT', unit: 'giây', refLow: 25, refHigh: 35 },
  INR: { code: 'INR', name: 'INR', unit: '', refLow: 0.8, refHigh: 1.2 },
  FIBRINOGEN: { code: 'FIBRINOGEN', name: 'Fibrinogen', unit: 'g/L', refLow: 2.0, refHigh: 4.0 },
  'D-DIMER': { code: 'D-DIMER', name: 'D-Dimer', unit: 'ng/mL', refLow: 0, refHigh: 500 },
  HBA1C: { code: 'HBA1C', name: 'HbA1c', unit: '%', refLow: 4.0, refHigh: 5.6 },
  CRP: { code: 'CRP', name: 'CRP', unit: 'mg/L', refLow: 0, refHigh: 5 },
  UA: { code: 'UA', name: 'Acid uric', unit: 'µmol/L', refLow: 200, refHigh: 420 }
};

/** Gói thiếu criteria trong DB → bộ mã chỉ số điển hình (5–7) */
const PACKAGE_CRITERIA_FALLBACK = {
  CBC: ['RBC', 'HGB', 'HCT', 'WBC', 'PLT', 'MCV', 'RDW'],
  'CBC-01': ['RBC', 'HGB', 'HCT', 'WBC', 'PLT', 'MCV', 'RDW'],
  HUYETDO: ['RBC', 'HGB', 'HCT', 'WBC', 'PLT', 'MCV', 'RDW'],
  THYROID: ['TSH', 'FT4', 'FT3', 'ANTI-TPO'],
  'PKG-THYROID-01': ['TSH', 'FT4', 'FT3', 'ANTI-TPO'],
  TUYENGIAP: ['TSH', 'FT4', 'FT3', 'ANTI-TPO'],
  LIPID: ['CHOL', 'TRIG', 'HDL', 'LDL'],
  LIVER: ['AST', 'ALT', 'GGT', 'BILI', 'TP', 'ALB'],
  GAN: ['AST', 'ALT', 'GGT', 'BILI', 'TP', 'ALB'],
  RENAL: ['UREA', 'CREA', 'UA'],
  THAN: ['UREA', 'CREA', 'UA'],
  ELECTROLYTE: ['NA', 'K', 'CL'],
  DIENGIAI: ['NA', 'K', 'CL'],
  COAG: ['PT', 'APTT', 'FIBRINOGEN'],
  DONGMAU: ['PT', 'APTT', 'FIBRINOGEN'],
  BIOCHEM: ['GLU', 'UREA', 'CREA', 'AST', 'ALT', 'CHOL'],
  SINHHOA: ['GLU', 'UREA', 'CREA', 'AST', 'ALT', 'CHOL']
};

function parseRefRange(raw) {
  if (raw == null || raw === '') return { refLow: null, refHigh: null };
  const s = String(raw);
  const m = s.match(/(-?\d+(?:[.,]\d+)?)\s*[-–—]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!m) return { refLow: null, refHigh: null };
  return {
    refLow: Number(String(m[1]).replace(',', '.')),
    refHigh: Number(String(m[2]).replace(',', '.'))
  };
}

function fromMedicalLib(code) {
  const key = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-');
  const hit = CRITERIA_MEDICAL[key] || CRITERIA_MEDICAL[key.replace(/-/g, '')];
  if (!hit) return null;
  return {
    code: hit.code,
    name: `${hit.code} · ${hit.name}`,
    value: '',
    unit: hit.unit || '—',
    refLow: hit.refLow ?? null,
    refHigh: hit.refHigh ?? null,
    criticalLow: hit.criticalLow ?? null,
    criticalHigh: hit.criticalHigh ?? null
  };
}

function criterionToParam(c) {
  const code = String(c.code || c.Code || c.criterionCode || c.CriterionCode || '').trim();
  const name = String(c.name || c.Name || c.criterionName || c.CriterionName || code).trim();
  const unit = String(c.unit || c.Unit || '').trim();
  const rangeRaw = c.referenceRange || c.ReferenceRange || c.refRange || '';
  let { refLow, refHigh } = parseRefRange(rangeRaw);
  const lib = fromMedicalLib(code);
  if ((refLow == null || refHigh == null) && lib) {
    refLow = lib.refLow;
    refHigh = lib.refHigh;
  }
  return {
    code: code || name,
    name: name.includes('·') ? name : `${code || 'XN'} · ${name}`,
    value: '',
    unit: unit || lib?.unit || '—',
    refLow,
    refHigh,
    criticalLow: c.criticalLow ?? c.CriticalLow ?? lib?.criticalLow ?? null,
    criticalHigh: c.criticalHigh ?? c.CriticalHigh ?? lib?.criticalHigh ?? null
  };
}

function dedupeParams(list) {
  const out = [];
  const seen = new Set();
  for (const p of list) {
    const key = String(p.code || p.name).toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function looksLikePackage(code, name) {
  const t = `${code} ${name}`.toUpperCase();
  return /PKG-|CBC|GÓI|GOI|PANEL|TỔNG|TONG|TẦM SOÁT|TAM SOAT|HUYẾT ĐỒ|HUYET DO|SINH HÓA|SINH HOA|LIPID|TUYẾN GIÁP|TUYEN GIAP|ĐÔNG MÁU|DONG MAU|THẬN|THAN |GAN /.test(t)
    || Object.keys(PACKAGE_CRITERIA_FALLBACK).some((k) => t.includes(k));
}

function normalizeText(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function fallbackCodesForPackage(code, name) {
  const t = normalizeText(`${code} ${name}`);
  for (const [key, codes] of Object.entries(PACKAGE_CRITERIA_FALLBACK)) {
    if (t.includes(key)) return codes;
  }
  // Tên gói TV dài (API search full-name hay [] ) → nhận diện panel
  if (/CBC|HUYET DO|HUYET HOC|TE BAO MAU|CONG THUC MAU|24 THONG|LASER|HEMATOL/.test(t)) {
    return PACKAGE_CRITERIA_FALLBACK.CBC;
  }
  if (/TSH|FT4|FT3|ANTI-?TPO|TUYEN GIAP|THYROID/.test(t)) return PACKAGE_CRITERIA_FALLBACK.THYROID;
  if (/\bPT\b|APTT|FIBRINOGEN|DONG MAU|COAG/.test(t)) return PACKAGE_CRITERIA_FALLBACK.COAG;
  if (/CHOLESTEROL|TRIGLYCERIDE|HDL|LDL|LIPID/.test(t)) return PACKAGE_CRITERIA_FALLBACK.LIPID;
  if (/AST|ALT|BILIRUBIN|GAN|LIVER/.test(t)) return PACKAGE_CRITERIA_FALLBACK.LIVER;
  if (/UREA|CREA|THAN|RENAL|ACID URIC/.test(t)) return PACKAGE_CRITERIA_FALLBACK.RENAL;
  if (/GLUCOSE|SINH HOA|BIOCHEM/.test(t)) return PACKAGE_CRITERIA_FALLBACK.BIOCHEM;
  return null;
}

function paramsFromCodeList(codes) {
  return dedupeParams(
    (codes || []).map((c) => fromMedicalLib(c)).filter(Boolean)
  );
}

function extractCriteria(pkg) {
  if (!pkg) return [];
  const data = pkg.data || pkg;
  const fromCriteria = data.criteria || data.Criteria || pkg.criteria || pkg.Criteria || [];
  if (Array.isArray(fromCriteria) && fromCriteria.length > 0) return fromCriteria;

  // service_packages.Tests (RBC/HGB/…) khi criteria map chưa hydrate
  const tests = data.tests || data.Tests || pkg.tests || pkg.Tests || [];
  if (Array.isArray(tests) && tests.length > 0) {
    return tests.map((t) => ({
      code: t.code || t.Code,
      name: t.name || t.Name,
      unit: t.unit || t.Unit || '',
      referenceRange: t.referenceRange || t.ReferenceRange || ''
    }));
  }
  return [];
}

/** Keyword ngắn — full tên gói TV hay trả [] từ /search */
function searchKeywordsFor(code, name) {
  const raw = String(name || code || '').trim();
  const norm = normalizeText(raw);
  const out = [];
  const push = (q) => {
    const s = String(q || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };

  if (code && String(code).length <= 24) push(code);
  if (/CBC|TE BAO|24 THONG|LASER|HUYET DO|CONG THUC MAU/.test(norm)) {
    push('CBC');
    push('CBC-01');
    push('PKG-CBC-01');
  }
  if (/TUYEN GIAP|THYROID|ANTI-?TPO/.test(norm)) push('THYROID');
  if (/DONG MAU|COAG|APTT/.test(norm)) push('COAG');
  if (/LIPID|CHOLESTEROL/.test(norm)) push('LIPID');
  if (/SINH HOA|BIOCHEM/.test(norm)) push('BIOCHEM');

  // Cụm 2–4 từ đầu (bỏ ngoặc)
  const cleaned = raw.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length >= 2) push(words.slice(0, 3).join(' '));
  if (words.length >= 4) push(words.slice(0, 4).join(' '));
  // Tránh đẩy full name dài (>48) vì search hay [] 
  if (cleaned.length > 0 && cleaned.length <= 48) push(cleaned);

  return out;
}

async function fetchPackageCriteriaById(id) {
  if (!id) return [];
  try {
    const pkg = await fetchServiceById(id);
    const fromCatalog = extractCriteria(pkg);
    if (fromCatalog.length > 0) return fromCatalog;
  } catch {
    // Fall through to Admin service-packages endpoint
  }
  try {
    const res = await api.get(`/service-packages/${encodeURIComponent(id)}`);
    return extractCriteria(res?.data);
  } catch {
    return [];
  }
}

function isCbcPackage(code, name) {
  return /CBC|HUYET DO|HUYET HOC|TE BAO|CONG THUC MAU|24 THONG|LASER|HEMATOL|COMPLETE BLOOD/.test(
    normalizeText(`${code} ${name}`)
  );
}

function canonicalPackageIds(code, name) {
  const key = String(code || '').trim();
  const ids = [];
  const push = (id) => {
    if (!id || id.length > 40 || /\s/.test(id)) return;
    if (!ids.includes(id)) ids.push(id);
  };
  push(key);
  if (key && !key.startsWith('PKG-')) push(`PKG-${key}`);
  if (key.startsWith('PKG-')) push(key.replace(/^PKG-/, ''));
  if (isCbcPackage(code, name)) {
    push('PKG-CBC-01');
    push('CBC-01');
    push('CBC');
    push('PKG-SINGLE-CBC');
  }
  const fbKey = fallbackCodesForPackage(code, name);
  if (fbKey === PACKAGE_CRITERIA_FALLBACK.THYROID || /THYROID|TUYEN GIAP/.test(normalizeText(`${code} ${name}`))) {
    push('PKG-THYROID-01');
  }
  return ids;
}

async function expandPackageByCodeOrName(code, name) {
  const key = String(code || '').trim();
  const label = String(name || key).trim();
  if (!key && !label) return [];

  // 0) Gói CBC / tên TV dài → ưu tiên PKG-CBC-01 (criteria trong DB), không chờ search full-name
  for (const id of canonicalPackageIds(key, label)) {
    const criteria = await fetchPackageCriteriaById(id);
    if (criteria.length > 0) return criteria.map(criterionToParam);
  }

  // 1) Search keyword ngắn → criteria từ test_package_criteria
  try {
    const keywords = searchKeywordsFor(key, label);
    let best = null;
    let bestCount = -1;

    for (const q of keywords) {
      const res = await searchTestPackages({ keyword: q, pageSize: 10 });
      const items = res?.items || res?.Items || res?.data?.items || [];
      for (const p of items) {
        let criteria = extractCriteria(p);
        const id = p.id || p.Id || p.packageCode || p.PackageCode;
        // Gói alias (PKG-SINGLE-CBC) criteria [] → hydrate bằng id chuẩn
        if (criteria.length === 0 && id && String(id).length <= 40) {
          criteria = await fetchPackageCriteriaById(id);
        }
        if (criteria.length === 0 && isCbcPackage(id, p.packageName || p.PackageName)) {
          criteria = await fetchPackageCriteriaById('PKG-CBC-01');
        }
        if (criteria.length > bestCount) {
          bestCount = criteria.length;
          best = { pkg: p, criteria };
        }
      }
      if (bestCount > 1) break;
    }

    if (best?.criteria?.length > 0) {
      return best.criteria.map(criterionToParam);
    }

    if (best?.pkg) {
      const fb = fallbackCodesForPackage(
        best.pkg.packageCode || best.pkg.PackageCode || key,
        best.pkg.packageName || best.pkg.PackageName || label
      );
      if (fb?.length) return paramsFromCodeList(fb);
    }
  } catch {
    /* fallthrough */
  }

  // 2) Fallback panel theo tên gói (tách từng chỉ — không bao giờ 1 dòng tên gói)
  const fb = fallbackCodesForPackage(key, label);
  if (fb?.length) return paramsFromCodeList(fb);

  // 3) Chỉ số lẻ (BS thêm) — chỉ khi KHÔNG giống tên gói
  if (!looksLikePackage(key, label)) {
    const single = fromMedicalLib(key) || fromMedicalLib(label);
    if (single) return [single];
  }

  return [];
}

export async function resolveParamsFromOrderItems(orderItems) {
  const items = Array.isArray(orderItems) ? orderItems : [];
  const params = [];
  const labels = [];

  for (const item of items) {
    const code = item?.testCode || item?.TestCode || item?.code || '';
    const name = item?.testName || item?.TestName || item?.name || code;
    labels.push(name || code);

    if (looksLikePackage(code, name)) {
      const expanded = await expandPackageByCodeOrName(code, name);
      params.push(...expanded);
      continue;
    }

    // Chỉ số lẻ: ưu tiên thư viện y tế (đơn vị + khoảng TC riêng)
    const lib = fromMedicalLib(code) || fromMedicalLib(name);
    if (lib) {
      params.push(lib);
      continue;
    }

    // Có thể là mã gói ngắn → cố expand catalog
    const expanded = await expandPackageByCodeOrName(code, name);
    params.push(...expanded);
  }

  return {
    params: dedupeParams(params),
    label: labels.filter(Boolean).join(' + ') || 'Theo y lệnh'
  };
}

export async function resolveParamsForSample(sample) {
  if (!sample) return { params: [], label: '', order: null };

  let order = null;
  const orderRef = sample.testOrderId || sample.TestOrderId || sample.orderId;
  const patientId = sample.patientId || sample.PatientId;
  const packageName = sample.testPackageName || sample.TestPackageName || sample.packageName || '';
  const packageCode =
    sample.packageId ||
    sample.PackageId ||
    sample.packageCode ||
    sample.PackageCode ||
    sample.testCode ||
    sample.TestCode ||
    '';

  if (orderRef) {
    try {
      const ordRes = await api.get(`/TestOrders/${encodeURIComponent(orderRef)}`);
      order = ordRes.data?.data ?? ordRes.data;
    } catch {
      order = null;
    }
  }

  if (!order?.items?.length && !order?.Items?.length && patientId) {
    try {
      const listRes = await api.get('/TestOrders', { params: { patientId } });
      const list = Array.isArray(listRes.data) ? listRes.data : listRes.data?.data || [];
      const active = (Array.isArray(list) ? list : [])
        .filter((o) => !/Draft|Cancelled/i.test(String(o.status || o.Status || '')))
        .sort((a, b) => new Date(b.createdAt || b.CreatedAt || 0) - new Date(a.createdAt || a.CreatedAt || 0));
      order = active.find((o) => o.id === orderRef || o.Id === orderRef) || active[0] || null;
    } catch {
      /* keep null */
    }
  }

  const items = order?.items || order?.Items || null;
  if (items?.length) {
    const resolved = await resolveParamsFromOrderItems(items);
    // Nếu y lệnh chỉ có 1 mã nhưng đó là gói → đã expand trong resolveParamsFromOrderItems
    if (resolved.params.length > 0) {
      return {
        params: resolved.params,
        label: `Y lệnh ${order.orderNumber || order.OrderNumber || ''} · ${resolved.params.length} chỉ số`.trim(),
        order
      };
    }
  }

  // Ống ghi tên gói / nhiều mã cách nhau bằng dấu phẩy
  if (packageCode || packageName) {
    const parts = String(packageName || packageCode)
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Nhiều mã trên nhãn ống (TSH, FT4, ANTI-TPO…) → từng chỉ + ràng buộc riêng
    if (parts.length > 1) {
      const multi = [];
      for (const part of parts) {
        const lib = fromMedicalLib(part);
        if (lib) multi.push(lib);
        else multi.push(...(await expandPackageByCodeOrName(part, part)));
      }
      return {
        params: dedupeParams(multi),
        label: `Theo ống: ${packageName || packageCode} · ${multi.length} chỉ số`,
        order
      };
    }

    const expanded = await expandPackageByCodeOrName(packageCode, packageName);
    return {
      params: dedupeParams(expanded),
      label: `Theo ống: ${packageName || packageCode} · ${expanded.length} chỉ số`,
      order
    };
  }

  return { params: [], label: 'Chưa gắn y lệnh / gói', order };
}

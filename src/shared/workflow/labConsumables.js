/**
 * @file labConsumables.js
 * @description Chuẩn hóa hiển thị tiếng Việt ống bệnh phẩm & ánh xạ vật tư y tế tiêu hao
 * chuyên biệt theo từng gói dịch vụ (ISO 15189:2022 §6.6 & CLSI GP41).
 */

export function formatTubeColorVi(colorOrType) {
  const key = String(colorOrType || '').trim().toLowerCase();
  if (!key) return '—';
  if (key.includes('red/yellow') || key.includes('đỏ/vàng') || key.includes('vàng/đỏ')) {
    return 'Ống Đỏ/Vàng (Serum Gel SST)';
  }
  if (key.includes('purple') || key.includes('edta') || key.includes('tím')) {
    return 'Ống Tím (K2-EDTA)';
  }
  if (key.includes('gold') || key.includes('yellow') || key.includes('sst') || key.includes('vàng')) {
    return 'Ống Vàng (Serum Gel SST)';
  }
  if (key.includes('red') || key.includes('đỏ') || key.includes('serum')) {
    return 'Ống Đỏ (Huyết thanh Serum)';
  }
  if (key.includes('blue') || key.includes('citrate') || key.includes('xanh dương')) {
    return 'Ống Xanh Dương (Na-Citrate 3.2%)';
  }
  if (key.includes('green') || key.includes('heparin') || key.includes('xanh lá')) {
    return 'Ống Xanh Lá (Lithium Heparin)';
  }
  if (key.includes('gray') || key.includes('grey') || key.includes('naf') || key.includes('xám')) {
    return 'Ống Xám (NaF / Oxalate)';
  }
  return colorOrType;
}

export function formatSampleTypeVi(sampleType) {
  const key = String(sampleType || '').trim().toLowerCase();
  if (!key) return '—';
  if (key === 'blood' || key.includes('whole blood')) return 'Máu toàn phần';
  if (key === 'serum') return 'Huyết thanh';
  if (key === 'plasma') return 'Huyết tương';
  if (key === 'urine') return 'Nước tiểu';
  return sampleType;
}

/**
 * Xác định danh sách mã vật tư tiêu hao chuẩn y tế theo từng gói dịch vụ & công đoạn:
 * - stage = 'COLLECTION' (Bước 1 - Lấy mẫu): Kim lấy máu, bộ sát khuẩn, ống nghiệm đúng loại gói.
 * - stage = 'ANALYSIS'   (Bước 2 - Tiếp nhận & chuẩn bị chạy máy): Cuvette/đầu côn dẫn mẫu + thuốc thử/kit chuyên biệt của gói.
 */
export function resolvePackageSupplyCodes(packageNameOrCode = '', tubeColor = '', stage = 'ANALYSIS') {
  const text = `${packageNameOrCode || ''} ${tubeColor || ''}`.toUpperCase();

  const isCbc = /CBC|TẾ BÀO MÁU|HUYẾT ĐỒ|HUYẾT HỌC/.test(text);
  const isCoag = /COAG|ĐÔNG MÁU|PT|APTT|FIBRIN|BLUE|CITRATE/.test(text);
  const isHepa = /HEPA|VIÊM GAN|HBSAG|HCV|MIỄN DỊCH/.test(text);
  const isLipid = /LIPID|MỠ MÁU|CHOLESTEROL|TRIGLYCERIDE/.test(text);
  const isDiab = /DIAB|ĐÁI THÁO ĐƯỜNG|TIỂU ĐƯỜNG|HBA1C/.test(text);
  const isLiver = /LIVER|CHỨC NĂNG GAN|MEN GAN/.test(text);
  const isGen = /PKG-GEN|TỔNG QUÁT/.test(text);
  const isBiochem = /BIOCHEM|SINH HÓA|GLUCOSE|CREATININE/.test(text);

  if (stage === 'COLLECTION') {
    const codes = ['SUP-NEEDLE-21G', 'SUP-PREP-KIT'];
    if (isCoag) {
      codes.push('TUBE-CITRATE-BLUE');
    } else if (isGen || isLiver || isDiab) {
      codes.push('TUBE-EDTA-PURPLE', 'TUBE-SERUM-RED');
    } else if (isCbc || /PURPLE|EDTA|TÍM/.test(text)) {
      codes.push('TUBE-EDTA-PURPLE');
    } else {
      codes.push('TUBE-SERUM-RED');
    }
    return [...new Set(codes)];
  }

  const codes = ['SUP-CUVETTE-TIP'];
  if (isHepa) {
    codes.push('TUBE-SERUM-RED', 'REA-HEPA-ARCH');
  } else if (isCoag) {
    codes.push('TUBE-CITRATE-BLUE', 'REA-COAG-STA');
  } else if (isLipid) {
    codes.push('TUBE-SERUM-RED', 'REA-LIPID-COBAS');
  } else if (isDiab) {
    codes.push('TUBE-EDTA-PURPLE', 'TUBE-SERUM-RED', 'REA-GLUC-COBAS', 'REA-HBA1C-COBAS', 'REA-LIPID-COBAS');
  } else if (isLiver) {
    codes.push('TUBE-SERUM-RED', 'TUBE-EDTA-PURPLE', 'REA-ALTL-COBAS', 'REA-CELLPACK-DCL');
  } else if (isGen) {
    codes.push('TUBE-EDTA-PURPLE', 'TUBE-SERUM-RED', 'REA-CELLPACK-DCL', 'REA-GLUC-COBAS', 'REA-ALTL-COBAS');
  } else if (isCbc) {
    codes.push('TUBE-EDTA-PURPLE', 'REA-CELLPACK-DCL', 'REA-4DL');
  } else if (isBiochem) {
    codes.push('TUBE-SERUM-RED', 'REA-GLUC-COBAS', 'REA-ALTL-COBAS');
  } else {
    codes.push('TUBE-SERUM-RED', 'REA-GLUC-COBAS');
  }
  return [...new Set(codes)];
}

/**
 * Ghép danh sách mã vật tư chuẩn của gói với dữ liệu tồn kho thực tế từ GET /api/inventory.
 * Trả về { recommended: [...], others: [...] } chỉ gồm các lô còn tồn và chưa hết hạn.
 */
export function matchSuppliesFromInventory(inventoryItems = [], packageNameOrCode = '', tubeColor = '', stage = 'ANALYSIS') {
  const usable = (Array.isArray(inventoryItems) ? inventoryItems : []).filter(
    (item) => Number(item?.quantity || 0) > 0 && item?.expiryStatus !== 'EXPIRED'
  );
  const wantedCodes = resolvePackageSupplyCodes(packageNameOrCode, tubeColor, stage);
  const wantedUpper = wantedCodes.map((c) => c.toUpperCase());

  const recommended = [];
  const usedIds = new Set();

  for (const code of wantedUpper) {
    const match = usable.find((it) => String(it.code || '').toUpperCase() === code && !usedIds.has(it.id));
    if (match) {
      recommended.push(match);
      usedIds.add(match.id);
    }
  }

  const others = usable.filter((it) => !usedIds.has(it.id));
  return { recommended, others, allUsable: usable };
}

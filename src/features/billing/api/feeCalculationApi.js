/**
 * @file feeCalculationApi.js
 * @description API client for medical billing fee calculations, BHYT co-pays, and vouchers (UC53 / Calculate Fees).
 * Conforms to: Production Standards, Clean Architecture & AGENTS-DESIGN.md.
 */

let _api = null;
const getApi = async () => {
    if (_api) return _api;
    try {
        const mod = await import("../../../config/api.js");
        _api = mod.default || mod;
        return _api;
    } catch {
        return null;
    }
};

/**
 * Calculates gross and net fees based on test packages, individual tests, service type, BHYT insurance, and vouchers.
 * @param {Object} payload CalculateFeeRequestDto
 * @returns {Promise<Object>} CalculateFeeResultDto
 */
export const calculateFee = async (payload) => {
    try {
        const api = await getApi();
        if (api) {
            const response = await api.post("/billing/calculate-fee", payload);
            return response.data?.data || response.data;
        }
    } catch (error) {
        console.error("Failed to calculate fee via API:", error);
    }
    // Fallback calculations for offline demo/development
    return computeOfflineFee(payload);
};

/**
 * Validates a standalone promotional voucher code against order amount.
 * @param {string} voucherCode Coupon code
 * @param {number} currentSubTotal Current test subtotal
 * @param {string} serviceType Clinic | HomeCollection
 * @returns {Promise<Object>} VoucherValidationResultDto
 */
export const validateVoucherCode = async (voucherCode, currentSubTotal = 0, serviceType = "Clinic") => {
    try {
        const api = await getApi();
        if (api) {
            const response = await api.post("/billing/validate-voucher", {
                voucherCode,
                currentSubTotal,
                serviceType
            });
            return response.data?.data || response.data;
        }
    } catch (error) {
        console.error("Failed to validate voucher via API:", error);
    }
    const surcharge = (serviceType || "").toLowerCase() === "homecollection" ? 150000 : 0;
    return computeOfflineVoucher(voucherCode, currentSubTotal, surcharge);
};

/**
 * Estimates fees for an existing test order.
 * @param {string} orderId Order ID or Order Number
 * @returns {Promise<Object|null>}
 */
export const estimateOrderFee = async (orderId) => {
    if (!orderId) return null;
    try {
        const api = await getApi();
        if (api) {
            const response = await api.get(`/billing/estimate/${encodeURIComponent(orderId)}`);
            return response.data?.data || null;
        }
    } catch (error) {
        console.error(`Failed to estimate order fee for ${orderId}:`, error);
    }
    return null;
};

// ----------------------------------------------------
// Offline Fallback Engines conforming to UC53 Logic
// ----------------------------------------------------

export const FallbackCatalog = {
    "PKG-CBC-01": { name: "Tổng Phân Tích Tế Bào Máu (CBC)", price: 150000, category: "Hematology" },
    "PKG-BIO-01": { name: "Sinh Hóa Máu Cơ Bản (Glucose, Ure, Creatinine)", price: 250000, category: "Biochemistry" },
    "PKG-LIPID-01": { name: "Bộ Mỡ Máu Toàn Phần (Cholesterol, Triglyceride, HDL, LDL)", price: 220000, category: "Biochemistry" },
    "PKG-LIVER-01": { name: "Bộ Men Gan (AST, ALT, GGT)", price: 180000, category: "Biochemistry" },
    "PKG-GENERAL-01": { name: "Gói Xét Nghiệm Sức Khỏe Tổng Quát Định Kỳ", price: 1200000, category: "General" }
};

export function computeOfflineFee(req) {
    const isHome = (req.serviceType || "").toLowerCase() === "homecollection";
    const homeSurcharge = isHome ? 150000 : 0;

    let testSubTotal = 0;
    const items = (req.packageIds || []).map((id) => {
        const item = FallbackCatalog[id] || { name: `Gói xét nghiệm #${id}`, price: 200000, category: "Laboratory" };
        testSubTotal += item.price;
        return {
            itemId: id,
            itemCode: id,
            itemName: item.name,
            category: item.category,
            unitPrice: item.price,
            quantity: 1,
            totalPrice: item.price,
            isBhytEligible: true,
            bhytCoveredAmount: 0,
            patientPayAmount: item.price
        };
    });

    let hasInsurance = false;
    let insuranceCoveragePercent = 0;
    let insuranceDeduction = 0;
    let tierDesc = "";

    if (req.insuranceCardNumber && req.insuranceCardNumber.trim().length >= 10) {
        hasInsurance = true;
        const prefix = req.insuranceCardNumber.trim().substring(0, 2).toUpperCase();
        if (["TE", "HT", "HN"].includes(prefix)) {
            insuranceCoveragePercent = 100;
            tierDesc = "BHYT chi trả 100% (Đối tượng ưu tiên đặc biệt)";
        } else if (prefix === "CN") {
            insuranceCoveragePercent = 95;
            tierDesc = "BHYT chi trả 95% (Hộ cận nghèo)";
        } else {
            insuranceCoveragePercent = 80;
            tierDesc = "BHYT chi trả 80% (Chuẩn BHXH Việt Nam)";
        }

        insuranceDeduction = Math.round(testSubTotal * (insuranceCoveragePercent / 100));
        items.forEach((it) => {
            it.bhytCoveredAmount = Math.round(it.totalPrice * (insuranceCoveragePercent / 100));
            it.patientPayAmount = it.totalPrice - it.bhytCoveredAmount;
        });
    }

    const voucher = computeOfflineVoucher(req.voucherCode, testSubTotal, homeSurcharge);

    let priorityDiscount = 0;
    if (req.isPriorityPatient && insuranceCoveragePercent < 100) {
        priorityDiscount = Math.min(100000, Math.round((testSubTotal - insuranceDeduction) * 0.1));
    }

    const totalDiscount = (voucher.discountAmount || 0) + priorityDiscount;
    const grossTotal = testSubTotal + homeSurcharge;
    const netTotal = Math.max(0, grossTotal - insuranceDeduction - totalDiscount);
    const roundedNet = Math.round(netTotal / 1000) * 1000;

    return {
        calculationReference: `CALC-${Date.now()}`,
        calculatedAt: new Date().toISOString(),
        items,
        testSubTotal,
        serviceType: isHome ? "HomeCollection" : "Clinic",
        homeCollectionSurcharge: homeSurcharge,
        grossTotal,
        hasInsurance,
        insuranceCardNumber: req.insuranceCardNumber,
        insuranceCoveragePercent,
        insuranceTierDescription: tierDesc,
        insuranceDeduction,
        voucherCode: req.voucherCode,
        isVoucherValid: voucher.isValid,
        voucherDescription: voucher.description,
        voucherDiscount: voucher.discountAmount || 0,
        isPriorityPatient: !!req.isPriorityPatient,
        priorityDiscount,
        totalDiscount,
        netTotalPayable: roundedNet,
        totalInWords: convertToVietnameseWords(roundedNet),
        currency: "VND"
    };
}

export function computeOfflineVoucher(code, subTotal, homeSurcharge) {
    if (!code) return { isValid: false, discountAmount: 0, description: "Chưa nhập mã ưu đãi" };
    const c = code.trim().toUpperCase();
    if (c === "BMS10" || c === "HEALTHY10") {
        return { isValid: true, discountAmount: Math.min(200000, Math.round(subTotal * 0.1)), description: "Giảm 10% phí xét nghiệm (tối đa 200,000đ)" };
    }
    if (c === "BMS20") {
        return { isValid: true, discountAmount: Math.min(500000, Math.round(subTotal * 0.2)), description: "Giảm 20% phí xét nghiệm (tối đa 500,000đ)" };
    }
    if (c === "FREEHOME") {
        return { isValid: true, discountAmount: homeSurcharge, description: "Miễn phí 100% phụ phí lấy mẫu tại nhà (150,000đ)" };
    }
    if (c === "VIP50") {
        return { isValid: true, discountAmount: 50000, description: "Giảm trực tiếp 50,000đ" };
    }
    return { isValid: false, discountAmount: 0, description: `Mã '${c}' không hợp lệ hoặc đã hết hạn` };
}

function convertToVietnameseWords(amount) {
    if (amount <= 0) return "Không đồng chẵn";
    const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    // Simplified client fallback representation
    return `${amount.toLocaleString("vi-VN")} đồng chẵn`;
}

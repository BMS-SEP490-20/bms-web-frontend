/**
 * @file CalculateFeesPage.jsx
 * @description Interactive clinical fee calculation and BHYT co-pay estimator (UC53 / Calculate Fees).
 * Conforms to: Production Standards, Clean Architecture, Decree 123/2020/ND-CP & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaCalculator,
    FaFileInvoiceDollar,
    FaShieldAlt,
    FaHome,
    FaClinicMedical,
    FaTag,
    FaCheckCircle,
    FaExclamationCircle,
    FaPrint,
    FaArrowRight,
    FaRedo,
    FaFlask,
    FaUserCheck
} from "react-icons/fa";
import { calculateFee, validateVoucherCode } from "../api/feeCalculationApi";

const AVAILABLE_PACKAGES = [
    { id: "PKG-CBC-01", code: "CBC-01", name: "Tổng Phân Tích Tế Bào Máu (CBC 24 Thông Số)", category: "Huyết học", price: 150000, tube: "EDTA (Tím)" },
    { id: "PKG-BIO-01", code: "BIO-01", name: "Sinh Hóa Máu Cơ Bản (Glucose, Ure, Creatinine)", category: "Sinh hóa", price: 250000, tube: "SST (Vàng)" },
    { id: "PKG-LIPID-01", code: "LIPID-01", name: "Bộ Mỡ Máu Toàn Phần (Cholesterol, Triglyceride, HDL, LDL)", category: "Sinh hóa", price: 220000, tube: "SST (Vàng)" },
    { id: "PKG-LIVER-01", code: "LIVER-01", name: "Bộ Men Gan Đầy Đủ (AST, ALT, GGT)", category: "Sinh hóa", price: 180000, tube: "Heparin (Xanh lá)" },
    { id: "PKG-GENERAL-01", code: "GEN-01", name: "Gói Xét Nghiệm Sức Khỏe Tổng Quát Định Kỳ Toàn Diện", category: "Tổng quát", price: 1200000, tube: "Đa ống nghiệm" }
];

export default function CalculateFeesPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Form states
    const [selectedPackageIds, setSelectedPackageIds] = useState(["PKG-CBC-01", "PKG-BIO-01"]);
    const [serviceType, setServiceType] = useState("Clinic"); // Clinic | HomeCollection
    const [insuranceCard, setInsuranceCard] = useState("");
    const [voucherInput, setVoucherInput] = useState("");
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [isPriority, setIsPriority] = useState(false);

    // Results state
    const [calculation, setCalculation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Initial query params parsing
    useEffect(() => {
        const pkgParam = searchParams.get("packages");
        if (pkgParam) {
            const list = pkgParam.split(",").map((s) => s.trim()).filter(Boolean);
            if (list.length > 0) setSelectedPackageIds(list);
        }
        const serviceParam = searchParams.get("serviceType");
        if (serviceParam) {
            setServiceType(serviceParam.toLowerCase() === "homecollection" ? "HomeCollection" : "Clinic");
        }
        const bhytParam = searchParams.get("bhyt");
        if (bhytParam) setInsuranceCard(bhytParam);
        const voucherParam = searchParams.get("voucher");
        if (voucherParam) setVoucherInput(voucherParam);
    }, [searchParams]);

    // Perform calculation whenever input changes
    const performCalculation = async (voucherCodeToUse = appliedVoucher?.code || voucherInput) => {
        setLoading(true);
        setErrorMsg("");
        try {
            const payload = {
                packageIds: selectedPackageIds,
                individualTestIds: [],
                serviceType,
                insuranceCardNumber: insuranceCard.trim(),
                voucherCode: voucherCodeToUse ? voucherCodeToUse.trim() : null,
                isPriorityPatient: isPriority
            };
            const result = await calculateFee(payload);
            setCalculation(result);
        } catch (err) {
            setErrorMsg("Không thể tính phí: " + (err.message || "Lỗi kết nối"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        performCalculation();
    }, [selectedPackageIds, serviceType, insuranceCard, isPriority]);

    // Handle package toggle
    const handleTogglePackage = (id) => {
        setSelectedPackageIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    // Apply voucher action
    const handleApplyVoucher = async () => {
        if (!voucherInput.trim()) return;
        try {
            const vRes = await validateVoucherCode(voucherInput.trim(), calculation?.testSubTotal || 0, serviceType);
            if (vRes.isValid) {
                setAppliedVoucher({
                    code: voucherInput.trim().toUpperCase(),
                    discountAmount: vRes.discountAmount,
                    description: vRes.description
                });
                performCalculation(voucherInput.trim().toUpperCase());
            } else {
                setErrorMsg(vRes.message || "Mã ưu đãi không hợp lệ.");
            }
        } catch (err) {
            setErrorMsg("Lỗi khi kiểm tra mã ưu đãi.");
        }
    };

    const handleClearVoucher = () => {
        setVoucherInput("");
        setAppliedVoucher(null);
        performCalculation("");
    };

    const handlePrint = () => {
        window.print();
    };

    const formatVnd = (num) => {
        return (num || 0).toLocaleString("vi-VN") + " ₫";
    };

    return (
        <div className="min-h-screen bg-[#F5F7FB] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner">
                                <FaCalculator />
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                    UC53 • TÍNH PHÍ XÉT NGHIỆM TỰ ĐỘNG
                                </span>
                                <h1 className="text-2xl font-bold text-slate-800 mt-1">
                                    Dự Toán & Tính Phí Xét Nghiệm
                                </h1>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mt-2">
                            Tự động chiết tính quyền lợi BHYT (80% - 100%), phụ phí lấy mẫu tại nhà, và mã voucher theo tiêu chuẩn Bộ Y Tế.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-stretch md:self-auto">
                        <button
                            onClick={() => {
                                setSelectedPackageIds(["PKG-CBC-01"]);
                                setServiceType("Clinic");
                                setInsuranceCard("");
                                setVoucherInput("");
                                setAppliedVoucher(null);
                                setIsPriority(false);
                            }}
                            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            <FaRedo className="text-xs" /> Làm mới
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <FaPrint /> In Dự Toán
                        </button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                        <FaExclamationCircle className="text-rose-500 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Main Grid: Form Inputs (Left) and Live Price Summary (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Configuration Controls */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* 1. Package Selection */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                                Chọn Danh Mục Gói Xét Nghiệm
                            </h2>
                            <p className="text-xs text-slate-500">
                                Đánh dấu chọn các gói xét nghiệm hoặc chỉ định của bác sĩ để hệ thống tính giá chuẩn.
                            </p>

                            <div className="space-y-2.5">
                                {AVAILABLE_PACKAGES.map((pkg) => {
                                    const checked = selectedPackageIds.includes(pkg.id);
                                    return (
                                        <label
                                            key={pkg.id}
                                            onClick={() => handleTogglePackage(pkg.id)}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                checked
                                                    ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/20"
                                                    : "bg-white border-slate-200 hover:border-slate-300"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {}}
                                                className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-semibold text-slate-800 text-sm">
                                                        {pkg.name}
                                                    </span>
                                                    <span className="font-bold text-blue-700 text-sm whitespace-nowrap">
                                                        {formatVnd(pkg.price)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                        Mã: {pkg.code}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Ống mẫu: {pkg.tube}</span>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Service Location Type */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                                Hình Thức Tiếp Nhận Mẫu
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setServiceType("Clinic")}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        serviceType === "Clinic"
                                            ? "bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg ${serviceType === "Clinic" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                                            <FaClinicMedical className="text-lg" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800 text-sm">Tại Phòng Khám</div>
                                            <div className="text-xs text-emerald-600 font-medium">Miễn phí dịch vụ</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Lấy mẫu trực tiếp tại phòng khám đa khoa BMS. Không phát sinh chi phí vận chuyển.
                                    </p>
                                </div>

                                <div
                                    onClick={() => setServiceType("HomeCollection")}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        serviceType === "HomeCollection"
                                            ? "bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg ${serviceType === "HomeCollection" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                                            <FaHome className="text-lg" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800 text-sm">Lấy Mẫu Tận Nơi</div>
                                            <div className="text-xs text-amber-600 font-bold">+150.000 ₫ phụ phí</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Kỹ thuật viên đến tận nhà, bảo quản mẫu theo chuẩn chuỗi lạnh ISO 15189.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. BHYT & Priority Information */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                                Bảo Hiểm Y Tế & Chế Độ Ưu Tiên
                            </h2>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Mã Thẻ BHYT (15 Ký tự theo chuẩn BHXH Việt Nam)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <FaShieldAlt />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: DN4791234567890 hoặc TE1012345678901..."
                                            value={insuranceCard}
                                            onChange={(e) => setInsuranceCard(e.target.value.toUpperCase())}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-xs text-slate-500">Mã mẫu thử nghiệm nhanh:</span>
                                        <button
                                            type="button"
                                            onClick={() => setInsuranceCard("TE1012345678901")}
                                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded font-mono"
                                        >
                                            TE (Trẻ em 100%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInsuranceCard("DN4791234567890")}
                                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded font-mono"
                                        >
                                            DN (Người lao động 80%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInsuranceCard("CN3012345678901")}
                                            className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded font-mono"
                                        >
                                            CN (Cận nghèo 95%)
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isPriority}
                                            onChange={(e) => setIsPriority(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <div className="text-xs">
                                            <span className="font-semibold text-slate-800">
                                                Đối tượng ưu tiên khám chữa bệnh
                                            </span>
                                            <p className="text-slate-500 mt-0.5">
                                                Người cao tuổi ≥ 80 tuổi, Trẻ em &lt; 6 tuổi, Người khuyết tật nặng (Giảm thêm 10% phí viện phí).
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 4. Voucher Code */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                                Mã Giảm Giá & Phiếu Quà Tặng
                            </h2>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <FaTag />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nhập mã ưu đãi (BMS10, FREEHOME, VIP50...)"
                                        value={voucherInput}
                                        onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleApplyVoucher}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
                                >
                                    Áp Dụng
                                </button>
                            </div>

                            {appliedVoucher && (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                                    <div className="flex items-center gap-2">
                                        <FaCheckCircle className="text-emerald-500 text-sm" />
                                        <span>
                                            Mã <strong>{appliedVoucher.code}</strong>: {appliedVoucher.description} (-{formatVnd(appliedVoucher.discountAmount)})
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleClearVoucher}
                                        className="text-xs text-rose-600 hover:underline font-semibold"
                                    >
                                        Hủy áp dụng
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>Mã gợi ý:</span>
                                <span onClick={() => { setVoucherInput("BMS10"); }} className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono text-blue-600">
                                    BMS10 (Giảm 10%)
                                </span>
                                <span onClick={() => { setVoucherInput("FREEHOME"); }} className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono text-blue-600">
                                    FREEHOME (Free ship)
                                </span>
                                <span onClick={() => { setVoucherInput("VIP50"); }} className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono text-blue-600">
                                    VIP50 (-50.000đ)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Breakdown & Grand Total */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 sticky top-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-blue-600 text-xl" />
                                    <h3 className="font-bold text-slate-800 text-lg">Bảng Dự Toán Chi Phí</h3>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">
                                    {calculation?.calculationReference || "CALC-READY"}
                                </span>
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Chi Tiết Các Khoản Phí
                                </div>

                                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                                    {calculation?.items && calculation.items.length > 0 ? (
                                        calculation.items.map((item, idx) => (
                                            <div key={idx} className="py-2.5 text-xs">
                                                <div className="flex justify-between font-semibold text-slate-700">
                                                    <span className="truncate pr-2">{item.itemName}</span>
                                                    <span>{formatVnd(item.totalPrice)}</span>
                                                </div>
                                                {item.bhytCoveredAmount > 0 && (
                                                    <div className="flex justify-between text-emerald-600 mt-0.5">
                                                        <span>BHYT chi trả ({calculation.insuranceCoveragePercent}%):</span>
                                                        <span>-{formatVnd(item.bhytCoveredAmount)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 text-xs">
                                            Chưa chọn gói xét nghiệm nào.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cost Breakdown Calculation Lines */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200">
                                <div className="flex justify-between text-slate-600">
                                    <span>Tổng phí xét nghiệm:</span>
                                    <span className="font-semibold text-slate-800">{formatVnd(calculation?.testSubTotal)}</span>
                                </div>

                                <div className="flex justify-between text-slate-600">
                                    <span>Phụ phí lấy mẫu ({serviceType === "HomeCollection" ? "Tận nơi" : "Tại viện"}):</span>
                                    <span className="font-semibold text-slate-800">{formatVnd(calculation?.homeCollectionSurcharge)}</span>
                                </div>

                                {calculation?.hasInsurance && (
                                    <div className="flex justify-between text-emerald-700 font-medium pt-1 border-t border-slate-200">
                                        <span className="flex items-center gap-1">
                                            <FaShieldAlt className="text-xs" />
                                            BHYT chi trả ({calculation.insuranceCoveragePercent}%):
                                        </span>
                                        <span>-{formatVnd(calculation.insuranceDeduction)}</span>
                                    </div>
                                )}

                                {calculation?.voucherDiscount > 0 && (
                                    <div className="flex justify-between text-blue-700 font-medium">
                                        <span className="flex items-center gap-1">
                                            <FaTag className="text-xs" />
                                            Voucher ({calculation.voucherCode}):
                                        </span>
                                        <span>-{formatVnd(calculation.voucherDiscount)}</span>
                                    </div>
                                )}

                                {calculation?.priorityDiscount > 0 && (
                                    <div className="flex justify-between text-indigo-700 font-medium">
                                        <span className="flex items-center gap-1">
                                            <FaUserCheck className="text-xs" />
                                            Ưu đãi viện phí đối tượng ưu tiên:
                                        </span>
                                        <span>-{formatVnd(calculation.priorityDiscount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Net Payable Grand Card */}
                            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-5 text-white shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                                        TỔNG TIỀN PHẢI THANH TOÁN
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-800 text-blue-200 font-mono">
                                        VND
                                    </span>
                                </div>

                                <div className="text-3xl font-extrabold tracking-tight text-white">
                                    {formatVnd(calculation?.netTotalPayable)}
                                </div>

                                <div className="pt-2 border-t border-blue-800/80 text-xs text-blue-200 italic leading-relaxed">
                                    Bằng chữ: <strong className="text-white not-italic">{calculation?.totalInWords || "Không đồng chẵn"}</strong>
                                </div>
                            </div>

                            {/* Primary Action Button */}
                            <button
                                onClick={() => {
                                    navigate(`/payments/checkout?amount=${calculation?.netTotalPayable || 0}`);
                                }}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                            >
                                <span>Tiến Hành Thanh Toán Ngay</span>
                                <FaArrowRight className="text-xs" />
                            </button>

                            <p className="text-[11px] text-center text-slate-400">
                                Áp dụng quy chuẩn hoá đơn điện tử Nghị định 123/2020/NĐ-CP & Luật BHYT Việt Nam.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

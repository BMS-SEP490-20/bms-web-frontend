/**
 * @file CreateTestOrderPage.jsx
 * @description UC32 & UC48 – Worklist-Driven Clinical CPOE (Lịch hẹn đã gọi số -> Modal Khám Lâm Sàng & Chỉ Định -> Chuyển Lab một chiều).
 *
 * Quy trình chuẩn y tế:
 *  1. Nạp danh sách bệnh nhân đã được gọi số từ Bàn khám (`currentServing` / `InProgress`) và hàng đợi `CheckedIn` (không fallback sang danh sách user rác).
 *  2. Hiển thị Table List lịch hẹn kèm trạng thái chỉ định (`Chờ chỉ định` | `Bản nháp` | `✓ Đã chuyển Lab`).
 *  3. Bấm "Chỉ định xét nghiệm" mở Modal cho đúng lịch hẹn: tự động nạp thông tin BN + khóa cứng gói BN đã đặt + khám sinh hiệu/ICD-10/tiền phân tích.
 *  4. Bấm "Chuyển Xuống Phòng Lab": phát hành y lệnh (`PaidPendingSample`), tự sinh ống mẫu `SMP-...`, đồng thời ẨN nút Chuyển ngay lập tức (chống bấm đúp / fallback).
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Modal, Button as BsButton, Card, Badge, Spinner, Form, Alert } from "react-bootstrap";
import { Search, ClipboardList, AlertTriangle, CheckCircle2, Save, TestTube2, User, ArrowLeft, Clock, Stethoscope, X as LucideX, Check as LucideCheck, RefreshCw, FileSignature, HeartPulse, Ban, Layers, Send, Megaphone } from 'lucide-react';
import {
  createTestOrder,
  fetchTestOrders,
  submitDraftTestOrder,
  updateTestOrderStatus
} from "../api/testOrderApi";
import { getPackages, getTestCriteria } from "../../admin/api/packageApi";
import { receptionApi } from "../../reception/api/receptionApi";
import { getAppointments } from "../../appointment/api/appointmentApi";
import { medicalRecordApi } from "../api/medicalRecordApi";
import WorkflowStepperBar from "../../../shared/components/WorkflowStepperBar";

// Danh mục mã bệnh quốc tế WHO ICD-10 chuẩn Bộ Y tế
const CLINICAL_ICD10_LIST = [
  { code: "E11.9", name: "Đái tháo đường typ 2 không biến chứng" },
  { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)" },
  { code: "E78.5", name: "Rối loạn chuyển hóa lipid máu (Tăng mỡ máu)" },
  { code: "D50.9", name: "Thiếu máu do thiếu sắt không đặc hiệu" },
  { code: "K29.7", name: "Viêm dạ dày tá tràng" },
  { code: "K76.0", name: "Gan nhiễm mỡ / Tăng men gan" },
  { code: "E03.9", name: "Suy giáp không đặc hiệu (Tầm soát tuyến giáp)" },
  { code: "M10.9", name: "Bệnh Gút (Gout) / Tăng Acid Uric" },
  { code: "N18.9", name: "Bệnh thận mạn / Đánh giá chức năng thận" },
  { code: "J20.9", name: "Viêm phế quản cấp / Nhiễm trùng hô hấp" },
  { code: "N39.0", name: "Nhiễm trùng đường tiết niệu" },
  { code: "Z00.0", name: "Khám sức khỏe tổng quát định kỳ" }
];

const ICD10_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

// Phân loại ống máu chuẩn CLSI GP41 (Thứ tự lấy máu: Citrate -> Serum -> EDTA -> Fluoride)
const resolveTubeSpec = (rawTube, category = "") => {
  const t = `${rawTube || ""} ${category || ""}`.toUpperCase();
  if (t.includes("CITRATE") || t.includes("BLUE") || t.includes("ĐÔNG MÁU")) {
    return {
      key: "CITRATE",
      label: "Ống Nắp Xanh Dương (Na-Citrate 3.2%)",
      shortLabel: "Citrate · Xanh dương",
      sampleType: "Huyết tương (2.7 mL)",
      colorHex: "#0284c7",
      bgHex: "#e0f2fe",
      drawOrder: 1
    };
  }
  if (t.includes("EDTA") || t.includes("PURPLE") || t.includes("TÍM") || t.includes("HUYẾT HỌC")) {
    return {
      key: "EDTA",
      label: "Ống Nắp Tím (K2-EDTA Chống Đông)",
      shortLabel: "K2-EDTA · Nắp Tím",
      sampleType: "Máu toàn phần (2.0 mL)",
      colorHex: "#7c3aed",
      bgHex: "#f3e8ff",
      drawOrder: 3
    };
  }
  if (t.includes("FLUORIDE") || t.includes("NAF") || t.includes("XÁM")) {
    return {
      key: "FLUORIDE",
      label: "Ống Nắp Xám (NaF / Oxalate)",
      shortLabel: "NaF · Nắp Xám",
      sampleType: "Huyết tương Glucose (2.0 mL)",
      colorHex: "#475569",
      bgHex: "#f1f5f9",
      drawOrder: 4
    };
  }
  return {
    key: "SERUM",
    label: "Ống Nắp Vàng / Đỏ (Serum Gel SST)",
    shortLabel: "Serum Gel · Vàng/Đỏ",
    sampleType: "Huyết thanh (4.0 mL)",
    colorHex: "#d97706",
    bgHex: "#fef3c7",
    drawOrder: 2
  };
};

const isOrderDispatched = (order) => {
  if (!order) return false;
  const st = String(order.status || "").toLowerCase();
  return Boolean(st && st !== "draft" && st !== "cancelled" && st !== "rejected");
};

const isOrderDraft = (order) => String(order?.status || "").toLowerCase() === "draft";

const formatDispatchedStatusLabel = (status) => {
  const st = String(status || "").toLowerCase();
  if (st === "paidpendingsample" || st === "ordered" || st === "awaitingpayment") return "Đã chuyển Lab (Chờ lấy mẫu)";
  if (st === "samplecollected" || st === "intransit" || st === "received") return "Lab đã nhận ống mẫu";
  if (st === "intesting" || st === "processing" || st === "testing") return "Đang chạy máy phân tích";
  if (st === "completed" || st === "approved") return "Đã hoàn tất kết quả";
  return "Đã chuyển Lab";
};

export default function CreateTestOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Query params khi điều hướng trực tiếp từ Bàn Khám / EMR
  const queryAppointmentId = searchParams.get("appointmentId") || searchParams.get("encounterId") || "";
  const queryPatientId = searchParams.get("patientId") || "";
  const queryPatientName = searchParams.get("patientName") || "";
  const queryPackageId = searchParams.get("packageId") || "";

  // Thông tin Bác sĩ đăng nhập
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const rawDocName = currentUser?.fullName || currentUser?.name || currentUser?.username || "";
  const doctorName = (!rawDocName || /^[0-9a-f]{24}$/i.test(rawDocName)) ? "Bác sĩ đang trực" : rawDocName;
  const doctorId = currentUser?.id || currentUser?.doctorId || currentUser?._id || "";

  // Worklist State (Bảng lịch hẹn đã gọi số & chờ khám)
  const [encounters, setEncounters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingWorklist, setLoadingWorklist] = useState(false);
  const [worklistError, setWorklistError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'READY' | 'DRAFT' | 'DISPATCHED'

  // Catalog State
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Modal Khám Lâm Sàng & Chỉ Định Xét Nghiệm
  const [activeModalEncounter, setActiveModalEncounter] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalCategory, setModalCategory] = useState("Tất cả");
  const [modalTypeFilter, setModalTypeFilter] = useState("ALL"); // 'ALL' | 'PACKAGE' | 'SINGLE'
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [lockedCodes, setLockedCodes] = useState(new Set());
  const [editingDraftId, setEditingDraftId] = useState(null);

  // Form Khám Lâm Sàng trong Modal
  const [vitals, setVitals] = useState({
    heartRate: 76,
    systolicBp: 120,
    diastolicBp: 80,
    temperature: 36.6,
    spo2: 98
  });
  const [saveToEmr, setSaveToEmr] = useState(true);
  const [selectedIcdCodes, setSelectedIcdCodes] = useState(["E11.9"]);
  const [customIcdInput, setCustomIcdInput] = useState("");
  const [icdError, setIcdError] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [fastingConfirmed, setFastingConfirmed] = useState(true);

  // Trạng thái Submit & Khóa nút Chuyển một chiều trong Modal
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [dispatchedOrderResult, setDispatchedOrderResult] = useState(null);
  const [autoOpenedFromUrl, setAutoOpenedFromUrl] = useState(false);

  // Modal Hủy Y Lệnh (chỉ trước khi Lab lấy mẫu)
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("Bác sĩ điều chỉnh chỉ định trước khi lấy mẫu");
  const [cancelBusy, setCancelBusy] = useState(false);

  // 1. Nạp Catalog Gói & Chỉ số thật từ Backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      try {
        const [pkgsRes, criteriaRes] = await Promise.allSettled([
          getPackages({ pageSize: 80 }),
          getTestCriteria()
        ]);
        const merged = [];
        const seen = new Set();

        const pkgs = pkgsRes.status === "fulfilled"
          ? (Array.isArray(pkgsRes.value) ? pkgsRes.value : (pkgsRes.value?.items || []))
          : [];
        pkgs.forEach((pkg) => {
          const cleanCode = (pkg.packageCode || pkg.code || "").trim().toUpperCase();
          if (!cleanCode || seen.has(cleanCode)) return;
          seen.add(cleanCode);
          merged.push({
            id: pkg.id,
            code: cleanCode,
            name: pkg.packageName || pkg.name,
            category: pkg.category || "Gói Khám Tổng Hợp",
            tubeType: pkg.sampleTube || "Serum-Đỏ/Vàng & EDTA-Tím",
            turnaroundTime: pkg.tat && pkg.tat.length > 25 ? "~2–4h" : (pkg.tat || "~2h"),
            preparationNotes: pkg.preparationNotes || "Nhịn ăn 8–12h nếu có chỉ định",
            price: pkg.discountPrice || pkg.price || 0,
            isPackage: true
          });
        });

        const criteria = criteriaRes.status === "fulfilled"
          ? (Array.isArray(criteriaRes.value) ? criteriaRes.value : (criteriaRes.value?.items || []))
          : [];
        criteria.forEach((c) => {
          const cleanCode = (c.code || c.testCriteriaCode || c.criterionCode || "").trim().toUpperCase();
          if (!cleanCode || seen.has(cleanCode)) return;
          seen.add(cleanCode);
          merged.push({
            id: c.id,
            code: cleanCode,
            name: c.name || c.testName || c.criterionName,
            category: c.category || "Sinh hóa",
            tubeType: c.sampleType || "Serum-Đỏ/Vàng",
            turnaroundTime: "~1.5h",
            preparationNotes: c.preparationNotes || "Theo quy định tiền phân tích",
            price: c.price || 80000,
            isPackage: false
          });
        });

        if (!cancelled) setCatalog(merged);
      } catch (err) {
        console.error("Lỗi tải danh mục xét nghiệm:", err);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Nạp danh sách Lịch hẹn đã Gọi Số (currentServing) + Hàng đợi (CheckedIn/InProgress) + Y lệnh hiện có
  const loadWorklist = useCallback(async () => {
    setLoadingWorklist(true);
    setWorklistError("");
    try {
      const [queueRes, aptRes, ordersData] = await Promise.all([
        receptionApi.getQueueStatus().catch(() => null),
        getAppointments({ pageSize: 100 }).catch(() => null),
        fetchTestOrders({})
      ]);

      const orderList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(orderList);

      const serving = queueRes?.currentServing || queueRes?.data?.currentServing || null;
      const waitingList = queueRes?.waitingList || queueRes?.data?.waitingList || [];
      const rawApts = aptRes?.data || aptRes?.items || (Array.isArray(aptRes) ? aptRes : []);

      // Map kết nối AppointmentId -> Orders
      const orderByKey = new Map();
      orderList.forEach((ord) => {
        if (String(ord.status || "").toLowerCase() === "cancelled") return;
        const keys = [ord.appointmentId, ord.orderNumber, ord.id].filter(Boolean);
        keys.forEach((k) => {
          const lk = String(k).toLowerCase();
          const prev = orderByKey.get(lk);
          if (!prev || isOrderDispatched(ord)) {
            orderByKey.set(lk, ord);
          }
        });
      });

      const encounterMap = new Map();

      // Bước A: Thêm bệnh nhân ĐANG ĐƯỢC GỌI SỐ tại Bàn Khám (currentServing) lên đầu tiên
      if (serving && (serving.appointmentId || serving.patientId)) {
        const key = String(serving.appointmentCode || serving.appointmentId || serving.patientId).toLowerCase();
        const rawQ = serving.queueNumberFormatted && serving.queueNumberFormatted !== "N/A"
          ? serving.queueNumberFormatted
          : (serving.queueNumber ? `Q-${String(serving.queueNumber).padStart(3, "0")}` : "");
        encounterMap.set(key, {
          key,
          appointmentId: serving.appointmentId || serving.appointmentCode || "",
          appointmentCode: serving.appointmentCode || serving.appointmentId || "—",
          queueNumber: rawQ || "Đang gọi",
          patientId: serving.patientId || "",
          patientName: serving.patientName || "Bệnh nhân",
          patientGender: serving.patientGender === "Female" ? "Nữ" : "Nam",
          patientAge: serving.patientAge || 35,
          patientPhone: serving.patientPhone || "",
          packageCode: serving.packageId || serving.testPackageId || "",
          packageName: serving.packageName || serving.testPackageName || "",
          appointmentStatus: "InProgress",
          isCurrentServing: true,
          roomId: serving.roomId || "ROOM-101",
          appointmentDate: serving.createdAt || new Date().toISOString()
        });
      }

      // Bước B: Thêm các bệnh nhân trong Hàng đợi phòng khám (waitingList)
      if (Array.isArray(waitingList)) {
        waitingList.forEach((w) => {
          if (!w || (!w.appointmentId && !w.patientId)) return;
          const key = String(w.appointmentCode || w.appointmentId || w.patientId).toLowerCase();
          const rawQ = w.queueNumberFormatted && w.queueNumberFormatted !== "N/A"
            ? w.queueNumberFormatted
            : (w.queueNumber ? `Q-${String(w.queueNumber).padStart(3, "0")}` : "");
          if (!encounterMap.has(key)) {
            encounterMap.set(key, {
              key,
              appointmentId: w.appointmentId || w.appointmentCode || "",
              appointmentCode: w.appointmentCode || w.appointmentId || "—",
              queueNumber: rawQ || "Chờ gọi",
              patientId: w.patientId || "",
              patientName: w.patientName || "Bệnh nhân",
              patientGender: "Nam",
              patientAge: 35,
              patientPhone: w.patientPhone || "",
              packageCode: w.packageId || "",
              packageName: w.packageName || "",
              appointmentStatus: w.status || "CheckedIn",
              isCurrentServing: false,
              roomId: w.roomId || "ROOM-101",
              appointmentDate: w.createdAt || new Date().toISOString()
            });
          }
        });
      }

      // Bước C: Hợp nhất thông tin đầy đủ từ Appointments (tên gói đã đặt, SĐT, giới tính, tuổi, trạng thái gọi số)
      if (Array.isArray(rawApts)) {
        rawApts.forEach((a) => {
          const st = String(a.status || "").toLowerCase();
          // Chỉ lấy các lịch hẹn đã Check-in / Đang gọi khám (InProgress) / Hoặc đã có y lệnh liên kết (Completed)
          if (st === "cancelled" || st === "noshow" || st === "pending") return;

          const keyCode = String(a.appointmentCode || "").toLowerCase();
          const keyId = String(a.id || a.appointmentId || "").toLowerCase();
          const existing = (keyCode && encounterMap.get(keyCode)) || (keyId && encounterMap.get(keyId));

          const pkgCode = a.packageId || a.testPackageId || a.packageCode || existing?.packageCode || "";
          const pkgName = a.packageName || a.testPackageName || existing?.packageName || "";
          const aptQueueStr = a.queueNumber ? `Q-${String(a.queueNumber).padStart(3, "0")}` : "";

          if (existing) {
            existing.appointmentId = a.id || a.appointmentId || existing.appointmentId;
            existing.appointmentCode = a.appointmentCode || existing.appointmentCode;
            if (aptQueueStr && (!existing.queueNumber || existing.queueNumber === "N/A" || existing.queueNumber === "Đang gọi" || existing.queueNumber === "Chờ gọi")) {
              existing.queueNumber = aptQueueStr;
            }
            existing.patientGender = a.patientGender === "Female" || a.patientGender === "Nữ" ? "Nữ" : existing.patientGender;
            existing.patientAge = a.patientAge || existing.patientAge;
            existing.patientPhone = a.patientPhone || a.phone || existing.patientPhone;
            existing.packageCode = pkgCode;
            existing.packageName = pkgName;
            existing.appointmentDate = a.appointmentDate || a.scheduledAt || existing.appointmentDate;
          } else if (st === "inprogress" || st === "checkedin" || st === "confirmed" || st === "completed") {
            const key = keyCode || keyId;
            if (!key) return;
            encounterMap.set(key, {
              key,
              appointmentId: a.id || a.appointmentId || "",
              appointmentCode: a.appointmentCode || a.id || "—",
              queueNumber: aptQueueStr || (st === "inprogress" ? "Đã gọi số" : "Đã Check-in"),
              patientId: a.patientId || "",
              patientName: a.patientName || a.patientFullName || "Bệnh nhân",
              patientGender: a.patientGender === "Female" || a.patientGender === "Nữ" ? "Nữ" : "Nam",
              patientAge: a.patientAge || 35,
              patientPhone: a.patientPhone || a.phone || "",
              packageCode: pkgCode,
              packageName: pkgName,
              appointmentStatus: a.status || "CheckedIn",
              isCurrentServing: st === "inprogress",
              roomId: a.roomId || "ROOM-101",
              appointmentDate: a.appointmentDate || a.scheduledAt || a.createdAt
            });
          }
        });
      }

      // Gắn trạng thái Y lệnh (Order) thực tế vào từng Lịch hẹn
      const usedOrderIds = new Set();
      const list = Array.from(encounterMap.values()).map((enc) => {
        let matchedOrder =
          orderByKey.get(String(enc.appointmentId).toLowerCase()) ||
          orderByKey.get(String(enc.appointmentCode).toLowerCase()) ||
          orderList.find(
            (o) =>
              String(o.status || "").toLowerCase() !== "cancelled" &&
              String(o.patientId || "").toLowerCase() === String(enc.patientId).toLowerCase() &&
              (String(o.appointmentId || "").toLowerCase() === String(enc.appointmentId).toLowerCase() ||
                String(o.appointmentId || "").toLowerCase() === String(enc.appointmentCode).toLowerCase())
          ) ||
          null;

        // Fallback cho các đơn vừa tạo trong ngày của cùng bệnh nhân khi bản ghi cũ chưa lưu appointmentId
        if (!matchedOrder) {
          matchedOrder =
            orderList.find((o) => {
              const oid = o.orderNumber || o.id;
              if (!oid || usedOrderIds.has(oid)) return false;
              if (String(o.status || "").toLowerCase() === "cancelled") return false;
              const samePatient =
                (enc.patientId && String(o.patientId || "").toLowerCase() === String(enc.patientId).toLowerCase()) ||
                (enc.patientName && String(o.patientName || "").toLowerCase() === String(enc.patientName).toLowerCase());
              if (!samePatient) return false;
              // Ưu tiên gắn cho ca đang gọi khám hoặc khớp mã gói xét nghiệm
              const pkgCode = String(enc.packageCode || "").toUpperCase();
              const hasSamePkg = !pkgCode || (Array.isArray(o.items) && o.items.some((it) => String(it.testCode || "").toUpperCase() === pkgCode));
              return enc.isCurrentServing || hasSamePkg;
            }) || null;
        }

        if (matchedOrder) {
          usedOrderIds.add(matchedOrder.orderNumber || matchedOrder.id);
        }

        return {
          ...enc,
          linkedOrder: matchedOrder
        };
      });

      // Sắp xếp: Ca đang gọi trong phòng -> Ca chưa chỉ định -> mới nhất lên đầu
      list.sort((a, b) => {
        if (a.isCurrentServing !== b.isCurrentServing) return a.isCurrentServing ? -1 : 1;
        const aDisp = isOrderDispatched(a.linkedOrder) ? 1 : 0;
        const bDisp = isOrderDispatched(b.linkedOrder) ? 1 : 0;
        if (aDisp !== bDisp) return aDisp - bDisp;
        const timeA = new Date(a.createdAt || a.appointmentDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.appointmentDate || 0).getTime();
        return timeB - timeA;
      });

      setEncounters(list);
    } catch (err) {
      setWorklistError(err?.message || "Không thể tải danh sách lịch hẹn đã gọi số.");
    } finally {
      setLoadingWorklist(false);
    }
  }, []);

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Helper đối chiếu gói đã đặt trong Catalog
  const resolveBookedPackageInCatalog = useCallback(
    (pkgCode, pkgName) => {
      if (!pkgCode && !pkgName) return null;
      const cLower = String(pkgCode || "").trim().toLowerCase();
      const nLower = String(pkgName || "").trim().toLowerCase();
      return (
        catalog.find(
          (item) =>
            (cLower && (String(item.code).toLowerCase() === cLower || String(item.id || "").toLowerCase() === cLower)) ||
            (nLower && String(item.name).toLowerCase() === nLower)
        ) || null
      );
    },
    [catalog]
  );

  // 3. Mở Modal Khám Lâm Sàng & Chỉ Định cho 1 Lịch hẹn
  const handleOpenClinicalModal = useCallback(
    async (enc) => {
      // Nếu lịch hẹn này đã chuyển xuống Lab rồi -> không cho mở form tạo mới (chống phá nghiệp vụ)
      if (isOrderDispatched(enc.linkedOrder)) {
        return;
      }

      setActiveModalEncounter(enc);
      setModalError("");
      setDispatchedOrderResult(null);
      setModalSearchTerm("");
      setModalCategory("Tất cả");
      setModalTypeFilter("ALL");
      setIcdError("");
      setCustomIcdInput("");
      setPriority("Routine");
      setSpecialInstructions("");
      setFastingConfirmed(true);

      // Nạp gói bệnh nhân đã đặt tại quầy/lịch hẹn và khóa cứng không cho bỏ chọn
      const preSet = new Set();
      const lockSet = new Set();
      const matchedPkg = resolveBookedPackageInCatalog(enc.packageCode, enc.packageName);
      if (matchedPkg) {
        preSet.add(matchedPkg.code);
        lockSet.add(matchedPkg.code);
      } else if (enc.packageCode) {
        preSet.add(String(enc.packageCode).trim().toUpperCase());
        lockSet.add(String(enc.packageCode).trim().toUpperCase());
      }

      // Nếu lịch hẹn đang có Bản nháp (Draft) -> nạp lại toàn bộ lựa chọn từ Bản nháp
      if (isOrderDraft(enc.linkedOrder)) {
        const draft = enc.linkedOrder;
        setEditingDraftId(draft.orderNumber || draft.id);
        (Array.isArray(draft.items) ? draft.items : []).forEach((it) => {
          if (it.testCode) preSet.add(String(it.testCode).toUpperCase());
        });
        setSelectedIcdCodes(
          Array.isArray(draft.icd10Codes) && draft.icd10Codes.length > 0 ? draft.icd10Codes : ["E11.9"]
        );
        setClinicalIndication(draft.clinicalIndication || "Khám lâm sàng & chỉ định xét nghiệm theo lịch hẹn");
        if (draft.priority) setPriority(draft.priority);
      } else {
        setEditingDraftId(null);
        setSelectedIcdCodes(["E11.9"]);
        setClinicalIndication(
          matchedPkg
            ? `Khám lâm sàng và chỉ định gói xét nghiệm đã đặt (${matchedPkg.name})`
            : "Khám lâm sàng và chỉ định xét nghiệm cận lâm sàng theo triệu chứng"
        );
      }

      setSelectedCodes(preSet);
      setLockedCodes(lockSet);

      // Tự động đồng bộ sinh hiệu & chẩn đoán từ Bệnh án EMR gần nhất của BN (nếu có)
      if (enc.patientId) {
        try {
          const emrRes = await medicalRecordApi.getPatientRecords(enc.patientId).catch(() => null);
          const rawList = emrRes?.data ?? emrRes?.items ?? emrRes;
          const records = Array.isArray(rawList) ? rawList : (Array.isArray(rawList?.items) ? rawList.items : []);
          if (records.length > 0) {
            const latest = records[0];
            if (latest.vitals) {
              setVitals({
                heartRate: latest.vitals.heartRate || 76,
                systolicBp: latest.vitals.systolicBp || 120,
                diastolicBp: latest.vitals.diastolicBp || 80,
                temperature: latest.vitals.temperature || 36.6,
                spo2: latest.vitals.spo2 || 98
              });
            }
            if (latest.icd10Code && ICD10_REGEX.test(String(latest.icd10Code).toUpperCase())) {
              const c = String(latest.icd10Code).toUpperCase();
              setSelectedIcdCodes((prev) => (prev.includes(c) ? prev : [c, ...prev]));
            }
            if (!isOrderDraft(enc.linkedOrder) && (latest.diagnosis || latest.chiefComplaint)) {
              setClinicalIndication(`Theo bệnh án EMR (${latest.recordCode || "mới nhất"}): ${latest.diagnosis || latest.chiefComplaint}`);
            }
          }
        } catch {
          // ignore EMR preload error
        }
      }
    },
    [resolveBookedPackageInCatalog]
  );

  // Auto-open modal nếu điều hướng từ Bàn Khám với ?appointmentId=... (chỉ 1 lần và chỉ khi chưa chuyển Lab)
  useEffect(() => {
    if (autoOpenedFromUrl || loadingWorklist || loadingCatalog) return;
    if (!queryAppointmentId && !queryPatientId) return;

    const target = encounters.find(
      (e) =>
        (queryAppointmentId &&
          (String(e.appointmentId).toLowerCase() === queryAppointmentId.toLowerCase() ||
            String(e.appointmentCode).toLowerCase() === queryAppointmentId.toLowerCase())) ||
        (queryPatientId && String(e.patientId).toLowerCase() === queryPatientId.toLowerCase())
    );

    if (target && !isOrderDispatched(target.linkedOrder)) {
      setAutoOpenedFromUrl(true);
      handleOpenClinicalModal(target);
    } else if (!target && queryAppointmentId && queryPatientId) {
      // Nếu điều hướng trực tiếp từ Bàn Khám mà chưa có trong list fetched, dựng encounter trực tiếp từ query params (không mock)
      setAutoOpenedFromUrl(true);
      handleOpenClinicalModal({
        key: queryAppointmentId.toLowerCase(),
        appointmentId: queryAppointmentId,
        appointmentCode: queryAppointmentId,
        queueNumber: searchParams.get("queueNumber") || "Q-002",
        patientId: queryPatientId,
        patientName: queryPatientName || "Bệnh nhân đang khám",
        patientGender: "Nam",
        patientAge: 35,
        patientPhone: searchParams.get("phone") || "",
        packageCode: queryPackageId,
        packageName: "",
        appointmentStatus: "InProgress",
        isCurrentServing: true,
        linkedOrder: null
      });
    }
  }, [
    autoOpenedFromUrl,
    loadingWorklist,
    loadingCatalog,
    queryAppointmentId,
    queryPatientId,
    queryPatientName,
    queryPackageId,
    searchParams,
    encounters,
    handleOpenClinicalModal
  ]);

  // Kiểm tra bất biến Huyết áp (Tâm thu > Tâm trương + 15)
  const bpValid = useMemo(() => {
    const sys = Number(vitals.systolicBp);
    const dia = Number(vitals.diastolicBp);
    if (!sys || !dia) return true;
    return sys > dia + 15;
  }, [vitals.systolicBp, vitals.diastolicBp]);

  // Các xét nghiệm đang chọn trong Modal (bao gồm gói đã đặt trước nếu chưa có trong catalog)
  const selectedTests = useMemo(() => {
    const map = new Map();
    catalog.forEach((c) => {
      if (selectedCodes.has(c.code)) map.set(c.code, c);
    });
    // Nếu gói đã đặt chưa kịp match với catalog (ví dụ tên khác), giữ nguyên thông tin gói thật từ appointment
    if (activeModalEncounter) {
      lockedCodes.forEach((code) => {
        if (!map.has(code) && selectedCodes.has(code)) {
          map.set(code, {
            code,
            name: activeModalEncounter.packageName || code,
            category: "Gói đã đặt",
            tubeType: "Serum-Đỏ/Vàng & EDTA-Tím",
            turnaroundTime: "~2h",
            preparationNotes: "Theo quy chuẩn gói đặt trước",
            price: 0,
            isPackage: true
          });
        }
      });
    }
    return Array.from(map.values());
  }, [catalog, selectedCodes, lockedCodes, activeModalEncounter]);

  const totalAmount = useMemo(
    () => selectedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0),
    [selectedTests]
  );

  const fastingInfo = useMemo(() => {
    const hasFasting = selectedTests.some(
      (t) =>
        String(t.preparationNotes || "").toLowerCase().includes("nhịn") ||
        String(t.preparationNotes || "").toLowerCase().includes("fast")
    );
    return { required: hasFasting, maxHours: hasFasting ? 8 : 0 };
  }, [selectedTests]);

  const autoTubeGroups = useMemo(() => {
    const map = new Map();
    selectedTests.forEach((t) => {
      const spec = resolveTubeSpec(t.tubeType, t.category);
      if (!map.has(spec.key)) map.set(spec.key, { ...spec, tests: [] });
      map.get(spec.key).tests.push(t);
    });
    return Array.from(map.values()).sort((a, b) => a.drawOrder - b.drawOrder);
  }, [selectedTests]);

  // Filter danh mục trong Modal
  const filteredModalCatalog = useMemo(() => {
    const kw = modalSearchTerm.trim().toLowerCase();
    return catalog.filter((item) => {
      if (modalTypeFilter === "PACKAGE" && !item.isPackage) return false;
      if (modalTypeFilter === "SINGLE" && item.isPackage) return false;

      const matchKw = !kw || item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw);
      const cat = String(item.category || "").toLowerCase();
      const matchCat =
        modalCategory === "Tất cả" ||
        (modalCategory === "Sinh hóa" && (cat.includes("biochem") || cat.includes("sinh hóa") || cat.includes("gan") || cat.includes("thận") || cat.includes("đái tháo"))) ||
        (modalCategory === "Huyết học" && (cat.includes("hemat") || cat.includes("huyết") || cat.includes("thiếu máu"))) ||
        (modalCategory === "Miễn dịch" && (cat.includes("immun") || cat.includes("miễn dịch") || cat.includes("giáp")));
      return matchKw && matchCat;
    });
  }, [catalog, modalSearchTerm, modalCategory, modalTypeFilter]);

  const handleToggleCode = (code) => {
    if (dispatchedOrderResult) return; // Đã chuyển Lab -> khóa cứng không cho sửa
    const next = new Set(selectedCodes);
    if (next.has(code)) {
      if (lockedCodes.has(code)) return; // Không cho bỏ tick gói bệnh nhân đã đặt
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedCodes(next);
  };

  const handleAddIcd = (code) => {
    const upper = code.trim().toUpperCase();
    if (!ICD10_REGEX.test(upper)) {
      setIcdError(`Mã ICD-10 "${upper}" sai định dạng chuẩn WHO (VD: E11.9, I10, Z00.0).`);
      return;
    }
    setIcdError("");
    if (!selectedIcdCodes.includes(upper)) {
      setSelectedIcdCodes([...selectedIcdCodes, upper]);
    }
    setCustomIcdInput("");
  };

  const handleRemoveIcd = (code) => {
    if (selectedIcdCodes.length <= 1) {
      setIcdError("Bắt buộc có ít nhất 1 mã bệnh WHO ICD-10.");
      return;
    }
    setIcdError("");
    setSelectedIcdCodes(selectedIcdCodes.filter((c) => c !== code));
  };

  // 4. Hành động Ký & Chuyển Xuống Phòng Lab (Một chiều — Sau khi ấn sẽ ẨN nút Chuyển)
  const handleDispatchToLab = async (isDraft = false) => {
    if (!activeModalEncounter || dispatchedOrderResult) return;

    if (!activeModalEncounter.patientId) {
      setModalError("Thiếu định danh bệnh nhân trên lịch hẹn.");
      return;
    }
    if (selectedTests.length === 0) {
      setModalError("Vui lòng chọn ít nhất một gói hoặc chỉ số xét nghiệm.");
      return;
    }
    if (!bpValid) {
      setModalError("Sinh hiệu không hợp lệ: Huyết áp tâm thu phải lớn hơn tâm trương ít nhất 15 mmHg.");
      return;
    }
    if (!isDraft && (!clinicalIndication.trim() || clinicalIndication.trim().length < 5)) {
      setModalError("Vui lòng nhập chẩn đoán lâm sàng / lý do chỉ định (tối thiểu 5 ký tự).");
      return;
    }
    if (!isDraft && selectedIcdCodes.length === 0) {
      setModalError("Vui lòng chọn ít nhất 1 mã chẩn đoán WHO ICD-10.");
      return;
    }
    if (!isDraft && fastingInfo.required && priority !== "STAT" && !fastingConfirmed) {
      setModalError("Vui lòng xác nhận sàng lọc điều kiện nhịn ăn 8–12h trước khi chuyển Lab.");
      return;
    }

    setSubmitting(true);
    setModalError("");

    try {
      let resData = null;

      if (!isDraft && editingDraftId) {
        const res = await submitDraftTestOrder(editingDraftId, { icd10Codes: selectedIcdCodes });
        resData = res?.data || res;
      } else {
        const payload = {
          patientId: activeModalEncounter.patientId,
          patientName: activeModalEncounter.patientName,
          patientGender: activeModalEncounter.patientGender,
          patientAge: Number(activeModalEncounter.patientAge) || 35,
          appointmentId: activeModalEncounter.appointmentId || activeModalEncounter.appointmentCode,
          doctorId,
          doctorName,
          icd10Codes: selectedIcdCodes,
          icd10Code: selectedIcdCodes[0] || "E11.9",
          priority,
          clinicalIndication: clinicalIndication.trim(),
          specialInstructions: specialInstructions.trim(),
          scheduledDate: new Date().toISOString().split("T")[0],
          saveAsDraft: isDraft,
          items: selectedTests.map((t) => ({
            testCode: t.code,
            testName: t.name,
            category: t.category || "Biochemistry",
            tubeType: t.tubeType || "Serum-Đỏ/Vàng",
            volumeMl: 4.0,
            turnaroundTime: t.turnaroundTime || "~2h",
            preparationNotes: t.preparationNotes || "Không yêu cầu",
            price: Number(t.price) || 0
          }))
        };
        const res = await createTestOrder(payload);
        resData = res?.data || res;
      }

      // Lưu kèm sinh hiệu & chẩn đoán khám lâm sàng vào EMR nếu Bác sĩ bật tùy chọn (không làm fail đơn nếu EMR lỗi nhẹ)
      if (!isDraft && saveToEmr && activeModalEncounter.patientId) {
        const firstIcd = selectedIcdCodes[0] || "Z00.0";
        const icdObj = CLINICAL_ICD10_LIST.find((x) => x.code === firstIcd);
        medicalRecordApi
          .createRecord({
            patientId: activeModalEncounter.patientId,
            chiefComplaint: clinicalIndication.trim(),
            clinicalSymptoms: specialInstructions.trim() || "Khám lâm sàng và chỉ định xét nghiệm",
            vitals: {
              heartRate: Number(vitals.heartRate) || 75,
              systolicBp: Number(vitals.systolicBp) || 120,
              diastolicBp: Number(vitals.diastolicBp) || 80,
              temperature: Number(vitals.temperature) || 36.6,
              spo2: Number(vitals.spo2) || 98,
              heightCm: 170,
              weightKg: 65
            },
            icd10Code: firstIcd,
            icd10Name: icdObj?.name || "Chẩn đoán lâm sàng",
            diagnosis: clinicalIndication.trim(),
            treatmentPlan: `Chỉ định xét nghiệm #${resData?.orderNumber || ""}: ${selectedTests.map((t) => t.name).join(", ")}`
          })
          .catch(() => null);
      }

      if (isDraft) {
        // Nếu lưu bản nháp: tải lại bảng và đóng modal
        await loadWorklist();
        setActiveModalEncounter(null);
      } else {
        setDispatchedOrderResult(resData || { status: "PaidPendingSample" });
        await loadWorklist();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Không thể chuyển y lệnh xuống Phòng Lab.";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Hủy Y Lệnh (chỉ khi chưa lấy mẫu)
  const handleConfirmCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    setCancelBusy(true);
    try {
      await updateTestOrderStatus(cancelTargetOrder.orderNumber || cancelTargetOrder.id, {
        status: "Cancelled",
        notes: cancelReason.trim() || "Bác sĩ hủy y lệnh trước khi lấy mẫu"
      });
      setCancelTargetOrder(null);
      await loadWorklist();
    } catch (err) {
      setWorklistError(err?.response?.data?.message || err?.message || "Không thể hủy y lệnh (mẫu có thể đã được lấy).");
      setCancelTargetOrder(null);
    } finally {
      setCancelBusy(false);
    }
  };

  // Thống kê & Lọc Table List
  const worklistStats = useMemo(() => {
    const total = encounters.length;
    const dispatched = encounters.filter((e) => isOrderDispatched(e.linkedOrder)).length;
    const draft = encounters.filter((e) => isOrderDraft(e.linkedOrder)).length;
    const ready = total - dispatched - draft;
    return { total, ready, draft, dispatched };
  }, [encounters]);

  const filteredEncounters = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return encounters.filter((enc) => {
      const disp = isOrderDispatched(enc.linkedOrder);
      const drf = isOrderDraft(enc.linkedOrder);
      if (statusFilter === "READY" && (disp || drf)) return false;
      if (statusFilter === "DRAFT" && !drf) return false;
      if (statusFilter === "DISPATCHED" && !disp) return false;

      if (!kw) return true;
      return (
        String(enc.appointmentCode || "").toLowerCase().includes(kw) ||
        String(enc.patientName || "").toLowerCase().includes(kw) ||
        String(enc.patientId || "").toLowerCase().includes(kw) ||
        String(enc.packageName || "").toLowerCase().includes(kw) ||
        String(enc.linkedOrder?.orderNumber || "").toLowerCase().includes(kw)
      );
    });
  }, [encounters, statusFilter, searchKeyword]);

  return (
    <div size="1em" className="w-100 py-1">
      {/* Header Card */}
      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Chỉ định xét nghiệm</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Chọn bệnh nhân từ danh sách chờ để khám và chỉ định xét nghiệm.
          </p>
        </div>
        <div className="bms-page-actions">
          <BsButton
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={loadWorklist}
            disabled={loadingWorklist}
          >
            <RefreshCw className={loadingWorklist ? "fa-spin me-1" : "me-1"} size={11} /> Làm mới
          </BsButton>
        </div>
      </div>

      {/* Quy trình 4 bước cho Bác sĩ */}
      <WorkflowStepperBar
        title="Quy trình làm việc của Bác sĩ (4 bước)"
        hint="Chọn bệnh nhân bên dưới → Khám & chọn mã ICD-10 → Ký & Chuyển xuống Phòng Lab"
        activeStep={2}
        steps={[
          { id: 'doc-1', label: 'Gọi bệnh nhân (F2)', desc: 'Mời người bệnh từ Hàng Đợi Chờ Khám vào bàn khám', path: '/doctor/console' },
          { id: 'doc-2', label: 'Chỉ định xét nghiệm', desc: 'Khám sinh hiệu, chọn ICD-10 & chuyển đơn xuống Phòng Lab', path: '/doctor/orders/create' },
          { id: 'doc-3', label: 'Chờ Phòng Lab phân tích', desc: 'KTV lấy mẫu, tiếp nhận ống mẫu & nhập chỉ số xét nghiệm' },
          { id: 'doc-4', label: 'Thẩm định & Ký số KQ', desc: 'Duyệt kết quả Lab, kết luận lâm sàng & phát hành cho BN', path: '/laboratory/biochemical-results' }
        ]}
      />

      {/* Thanh Lọc 1 Dòng & Pills Trạng Thái */}
      <div className="bms-filter-bar mb-3 flex-wrap">
        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: "260px" }}>
          <Search className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo mã hẹn (APT-...), tên bệnh nhân, mã PAT-..., hoặc mã chỉ định ORD-..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button type="button" className="bms-search-clear" onClick={() => setSearchKeyword("")}>
              <LucideX size={12} />
            </button>
          )}
        </div>

        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          {[
            { id: "ALL", label: `Tất cả lịch hẹn (${worklistStats.total})` },
            { id: "READY", label: `Chờ chỉ định (${worklistStats.ready})` },
            { id: "DRAFT", label: `Bản nháp (${worklistStats.draft})` },
            { id: "DISPATCHED", label: `Đã chuyển Lab (${worklistStats.dispatched})` }
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className="btn btn-sm rounded-pill px-3 fw-semibold"
                style={{
                  fontSize: "0.78rem",
                  backgroundColor: active ? "#1E60E6" : "#EEF2F6",
                  color: active ? "#FFFFFF" : "#475569",
                  border: "none"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {worklistError && (
        <Alert variant="danger" dismissible onClose={() => setWorklistError("")} className="py-2 mb-3 rounded-3 small">
          <AlertTriangle className="me-2"  size="1em"/>
          {worklistError}
        </Alert>
      )}

      {/* BẢNG DANH SÁCH LỊCH HẸN ĐÃ GỌI SỐ / CHỜ KHÁM (WORKLIST TABLE) */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Card.Header className="bg-white py-2.5 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <ClipboardList className="text-primary"  size="1em"/>
            <h6 className="fw-bold text-dark mb-0">Danh Sách Lịch Hẹn Bệnh Nhân (Từ Bàn Khám &amp; Hàng Đợi)</h6>
          </div>
          <Badge bg="light" text="dark" className="border rounded-pill px-3 py-1">
            Hiển thị {filteredEncounters.length} ca khám
          </Badge>
        </Card.Header>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase text-muted">
              <tr>
                <th className="ps-3" style={{ width: "17%" }}>STT &amp; Mã Lịch Hẹn</th>
                <th style={{ width: "20%" }}>Bệnh Nhân</th>
                <th style={{ width: "24%" }}>Gói Đã Đặt Tại Quầy</th>
                <th style={{ width: "21%" }}>Trạng Thái Chỉ Định</th>
                <th className="text-end pe-3" style={{ width: "18%" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingWorklist ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted small">
                    <Spinner animation="border" size="sm" className="me-2 text-primary" />
                    Đang đồng bộ danh sách bệnh nhân đã gọi số &amp; lịch hẹn từ máy chủ...
                  </td>
                </tr>
              ) : filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <User className="fs-2 text-muted opacity-25 mb-2"  size="1em"/>
                    <div className="fw-bold text-dark mb-1">
                      {searchKeyword || statusFilter !== "ALL"
                        ? "Không có lịch hẹn nào khớp với bộ lọc hiện tại"
                        : "Chưa có bệnh nhân nào được gọi số từ Bàn khám & Hàng đợi"}
                    </div>
                    <p className="text-muted small mb-3">
                      Bác sĩ cần bấm <strong>Gọi Bệnh Nhân Tiếp Theo (F2)</strong> tại Bàn khám (hoặc Lễ tân Check-in bệnh nhân) để lượt hẹn xuất hiện tại đây.
                    </p>
                    <Link
                      to="/doctor/console"
                      className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold text-white"
                      style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                    >
                      <Megaphone className="me-1.5"  size="1em"/> Mở Bàn Khám &amp; Gọi Số
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredEncounters.map((enc) => {
                  const ord = enc.linkedOrder;
                  const dispatched = isOrderDispatched(ord);
                  const draft = isOrderDraft(ord);
                  const matchedPkg = resolveBookedPackageInCatalog(enc.packageCode, enc.packageName);
                  const displayPkgName = matchedPkg?.name || enc.packageName || enc.packageCode || "Khám tư vấn trực tiếp";

                  return (
                    <tr
                      key={enc.key}
                      style={{
                        backgroundColor: enc.isCurrentServing && !dispatched ? "rgba(30, 96, 230, 0.04)" : undefined
                      }}
                    >
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          <span className="fw-bold font-monospace text-primary small">{enc.queueNumber}</span>
                          {enc.isCurrentServing && (
                            <Badge bg="primary" pill style={{ fontSize: "0.68rem" }}>
                              ● Đang gọi khám
                            </Badge>
                          )}
                        </div>
                        <div className="small text-muted font-monospace mt-0.5">{enc.appointmentCode}</div>
                      </td>

                      <td>
                        <div className="fw-bold text-dark small">{enc.patientName}</div>
                        <div className="text-muted small font-monospace">
                          {enc.patientId || "—"} · {enc.patientGender}, {enc.patientAge}t
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark small">{displayPkgName}</div>
                        {(matchedPkg?.code || enc.packageCode) && (
                          <code className="text-primary" style={{ fontSize: "0.73rem" }}>
                            {matchedPkg?.code || enc.packageCode}
                          </code>
                        )}
                      </td>

                      <td>
                        {dispatched ? (
                          <div>
                            <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill px-2.5 py-1">
                              ✓ {formatDispatchedStatusLabel(ord.status)}
                            </Badge>
                            <div className="small text-muted font-monospace mt-0.5">
                              Chỉ định: <strong>{ord.orderNumber}</strong>
                            </div>
                          </div>
                        ) : draft ? (
                          <div>
                            <Badge bg="warning-subtle" text="warning-emphasis" className="border border-warning-subtle rounded-pill px-2.5 py-1">
                              ● Đã lưu bản nháp
                            </Badge>
                            <div className="small text-muted font-monospace mt-0.5">{ord.orderNumber}</div>
                          </div>
                        ) : (
                          <Badge bg="light" text="dark" className="border rounded-pill px-2.5 py-1">
                            Chờ bác sĩ khám &amp; chỉ định
                          </Badge>
                        )}
                      </td>

                      <td className="text-end pe-3">
                        {/* CƠ CHẾ CHẶN ẨN NÚT SAU KHI CHUYỂN LAB */}
                        {dispatched ? (
                          <div className="d-inline-flex align-items-center gap-1.5">
                            <span className="badge bg-success text-white rounded-pill px-2.5 py-1.5 small fw-semibold">
                              <LucideCheck className="me-1"  size="1em"/> Đã chuyển Lab
                            </span>
                            {(String(ord.status || "").toLowerCase() === "paidpendingsample" ||
                              String(ord.status || "").toLowerCase() === "ordered") && (
                                <BsButton
                                  variant="outline-danger"
                                  size="sm"
                                  className="rounded-pill px-2 py-1"
                                  title="Hủy chỉ định trước khi Lab lấy mẫu"
                                  onClick={() => setCancelTargetOrder(ord)}
                                >
                                  <Ban size={11} />
                                </BsButton>
                              )}
                          </div>
                        ) : (
                          <BsButton
                            variant="primary"
                            size="sm"
                            className="rounded-pill px-3 py-1.5 fw-semibold text-white text-nowrap shadow-sm"
                            style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                            onClick={() => handleOpenClinicalModal(enc)}
                          >
                            <Stethoscope className="me-1.5"  size="1em"/>
                            {draft ? "Mở bản nháp & Chuyển" : "Chỉ định xét nghiệm"}
                          </BsButton>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =========================================================================================
          MODAL KHÁM LÂM SÀNG & CHỈ ĐỊNH XÉT NGHIỆM (NẠP GÓI ĐẶT TRƯỚC + KHÓA NÚT CHUYỂN 1 CHIỀU)
         ========================================================================================= */}
      <Modal
        show={Boolean(activeModalEncounter)}
        onHide={() => {
          if (!submitting) setActiveModalEncounter(null);
        }}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton={!submitting} className="bg-light border-bottom py-2.5 px-3">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
            <Stethoscope className="text-primary"  size="1em"/>
            <span>Khám Lâm Sàng &amp; Chỉ Định Xét Nghiệm</span>
            {activeModalEncounter && (
              <Badge bg="primary" pill className="font-monospace">
                {activeModalEncounter.appointmentCode}
              </Badge>
            )}
            {editingDraftId && (
              <Badge bg="warning" text="dark" pill>
                Bản nháp #{editingDraftId}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3" style={{ backgroundColor: "#F8FAFC" }}>
          {modalError && (
            <Alert variant="danger" dismissible onClose={() => setModalError("")} className="py-2 px-3 mb-3 rounded-3 small">
              <AlertTriangle className="me-2"  size="1em"/>
              {modalError}
            </Alert>
          )}

          {/* THÔNG BÁO ĐÃ CHUYỂN LAB THÀNH CÔNG */}
          {dispatchedOrderResult && (
            <Alert variant="success" className="p-3 mb-3 rounded-4 border-success shadow-sm">
              <div className="d-flex align-items-center gap-3">
                <CheckCircle2 className="fs-2 text-success flex-shrink-0"  size="1em"/>
                <div>
                  <div className="fw-bold text-dark fs-6">
                    Đã Ký &amp; Chuyển Chỉ Định #{dispatchedOrderResult.orderNumber || dispatchedOrderResult.id} Xuống Phòng Lab Thành Công!
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {activeModalEncounter && (
            <>
              {/* KHỐI 1: THÔNG TIN BỆNH NHÂN & LỊCH HẸN */}
              <div className="p-2.5 px-3 rounded-4 bg-white border mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2.5 flex-wrap">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{ width: 38, height: 38, backgroundColor: "#1E60E6" }}
                  >
                    <User  size="1em"/>
                  </div>
                  <div>
                    <div className="fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
                      <span>{activeModalEncounter.patientName}</span>
                      <Badge bg="light" text="dark" className="border font-monospace rounded-pill">
                        {activeModalEncounter.patientId}
                      </Badge>
                      <Badge bg="light" text="dark" className="border rounded-pill">
                        {activeModalEncounter.patientGender} · {activeModalEncounter.patientAge} tuổi
                      </Badge>
                    </div>
                    <div className="small text-muted">
                      SĐT: <strong>{activeModalEncounter.patientPhone || "Chưa cung cấp"}</strong> ·
                      STT: <strong className="text-primary">{activeModalEncounter.queueNumber}</strong> ·
                      Bác sĩ khám: <strong>{doctorName}</strong>
                    </div>
                  </div>
                </div>

                {activeModalEncounter.packageName || activeModalEncounter.packageCode ? (
                  <div className="px-3 py-1.5 rounded-3 bg-primary-subtle border border-primary-subtle small">
                    <div className="text-primary fw-bold" style={{ fontSize: "0.72rem" }}>
                      GÓI BỆNH NHÂN ĐÃ ĐẶT (TỰ ĐỘNG KHÓA):
                    </div>
                    <div className="fw-bold text-dark">
                      {resolveBookedPackageInCatalog(activeModalEncounter.packageCode, activeModalEncounter.packageName)?.name ||
                        activeModalEncounter.packageName ||
                        activeModalEncounter.packageCode}
                    </div>
                  </div>
                ) : (
                  <Badge bg="light" text="secondary" className="border rounded-pill px-3 py-1.5">
                    Khám trực tiếp — Chọn chỉ định bên dưới
                  </Badge>
                )}
              </div>

              <div className="row g-3">
                {/* CỘT TRÁI MODAL (7 PHẦN): KHÁM LÂM SÀNG + CHỌN/BỔ SUNG XÉT NGHIỆM */}
                <div className="col-lg-7">
                  {/* KHỐI 2: KHÁM LÂM SÀNG CHUẨN Y TẾ (SINH HIỆU & ICD-10) */}
                  <Card className="border-0 shadow-xs rounded-4 mb-3 bg-white">
                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                      <span className="fw-bold small text-dark text-uppercase d-flex align-items-center gap-1.5">
                        <HeartPulse className="text-danger"  size="1em"/> 1. Khám Lâm Sàng, Sinh Hiệu &amp; Chẩn Đoán ICD-10
                      </span>
                      <Form.Check
                        type="switch"
                        id="save-emr-switch"
                        label={<span className="small fw-semibold text-primary">Lưu vào Bệnh án EMR</span>}
                        checked={saveToEmr}
                        disabled={Boolean(dispatchedOrderResult)}
                        onChange={(e) => setSaveToEmr(e.target.checked)}
                      />
                    </Card.Header>

                    <Card.Body className="p-2.5">
                      {/* Dấu hiệu sinh tồn */}
                      <div className="row g-2 mb-2.5">
                        <div className="col-6 col-sm-3">
                          <label className="small text-muted fw-semibold mb-0.5">Mạch (bpm)</label>
                          <Form.Control
                            size="sm"
                            type="number"
                            value={vitals.heartRate}
                            disabled={Boolean(dispatchedOrderResult)}
                            onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                          />
                        </div>
                        <div className="col-6 col-sm-3">
                          <label className="small text-muted fw-semibold mb-0.5">HA (Tâm thu/trương)</label>
                          <div className="d-flex align-items-center gap-1">
                            <Form.Control
                              size="sm"
                              type="number"
                              value={vitals.systolicBp}
                              disabled={Boolean(dispatchedOrderResult)}
                              onChange={(e) => setVitals({ ...vitals, systolicBp: e.target.value })}
                            />
                            <span>/</span>
                            <Form.Control
                              size="sm"
                              type="number"
                              value={vitals.diastolicBp}
                              disabled={Boolean(dispatchedOrderResult)}
                              onChange={(e) => setVitals({ ...vitals, diastolicBp: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-sm-3">
                          <label className="small text-muted fw-semibold mb-0.5">Nhiệt độ (°C)</label>
                          <Form.Control
                            size="sm"
                            type="number"
                            step="0.1"
                            value={vitals.temperature}
                            disabled={Boolean(dispatchedOrderResult)}
                            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                          />
                        </div>
                        <div className="col-6 col-sm-3">
                          <label className="small text-muted fw-semibold mb-0.5">SpO2 (%)</label>
                          <Form.Control
                            size="sm"
                            type="number"
                            value={vitals.spo2}
                            disabled={Boolean(dispatchedOrderResult)}
                            onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                          />
                        </div>
                      </div>

                      {!bpValid && (
                        <div className="text-danger small mb-2 fw-semibold">
                          ⚠ Huyết áp tâm thu phải lớn hơn huyết áp tâm trương ít nhất 15 mmHg.
                        </div>
                      )}

                      {/* Mã bệnh ICD-10 */}
                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="small fw-bold text-dark mb-0">
                            Mã bệnh WHO ICD-10 <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex flex-wrap gap-1">
                            {selectedIcdCodes.map((code) => (
                              <span
                                key={code}
                                className="badge d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill text-white"
                                style={{ backgroundColor: "#1E60E6", fontSize: "0.73rem" }}
                              >
                                <span className="font-monospace fw-bold">{code}</span>
                                {!dispatchedOrderResult && (
                                  <LucideX style={{ cursor: "pointer" }} onClick={() => handleRemoveIcd(code)} />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                        {icdError && <div className="text-danger small mb-1">{icdError}</div>}
                        {!dispatchedOrderResult && (
                          <div className="d-flex gap-1.5">
                            <select
                              className="form-select form-select-sm rounded-pill"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleAddIcd(e.target.value);
                              }}
                            >
                              <option value="">+ Chọn nhanh mã bệnh ICD-10...</option>
                              {CLINICAL_ICD10_LIST.map((icd) => (
                                <option key={icd.code} value={icd.code} disabled={selectedIcdCodes.includes(icd.code)}>
                                  {icd.code} — {icd.name}
                                </option>
                              ))}
                            </select>
                            <div className="input-group input-group-sm" style={{ maxWidth: "135px" }}>
                              <input
                                type="text"
                                className="form-control rounded-start-pill"
                                placeholder="Mã khác..."
                                value={customIcdInput}
                                onChange={(e) => setCustomIcdInput(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-outline-primary rounded-end-pill px-2"
                                onClick={() => customIcdInput && handleAddIcd(customIcdInput)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Triệu chứng & Lý do chỉ định */}
                      <div className="row g-2">
                        <div className="col-12">
                          <label className="small fw-bold text-dark mb-0.5">
                            Triệu chứng &amp; Chẩn đoán lâm sàng <span className="text-danger">*</span>
                          </label>
                          <Form.Control
                            size="sm"
                            as="textarea"
                            rows={2}
                            disabled={Boolean(dispatchedOrderResult)}
                            value={clinicalIndication}
                            onChange={(e) => setClinicalIndication(e.target.value)}
                            placeholder="Ghi triệu chứng lâm sàng, mục tiêu chỉ định xét nghiệm..."
                          />
                        </div>
                        <div className="col-6">
                          <label className="small fw-semibold text-secondary mb-0.5">Độ ưu tiên</label>
                          <select
                            className="form-select form-select-sm"
                            disabled={Boolean(dispatchedOrderResult)}
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                          >
                            <option value="Routine">Thường quy (Routine)</option>
                            <option value="Urgent">Khẩn (Urgent)</option>
                            <option value="STAT">Cấp cứu (STAT)</option>
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="small fw-semibold text-secondary mb-0.5">Ghi chú kỹ thuật cho Lab</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            disabled={Boolean(dispatchedOrderResult)}
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="Lưu ý kháng đông, lấy mẫu..."
                          />
                        </div>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* KHỐI 3: BẢNG CHỌN GÓI / CHỈ SỐ XÉT NGHIỆM BỔ SUNG */}
                  <Card className="border-0 shadow-xs rounded-4 bg-white overflow-hidden">
                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <span className="fw-bold small text-dark text-uppercase">
                        2. Gói Đã Đặt &amp; Chỉ Định Bổ Sung
                      </span>
                      <div className="d-flex gap-1">
                        {[
                          { id: "ALL", label: "Tất cả" },
                          { id: "PACKAGE", label: "Gói" },
                          { id: "SINGLE", label: "Chỉ số lẻ" }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setModalTypeFilter(t.id)}
                            className="btn btn-sm rounded-pill px-2.5 py-0.5 fw-semibold"
                            style={{
                              fontSize: "0.72rem",
                              backgroundColor: modalTypeFilter === t.id ? "#1E60E6" : "#EEF2F6",
                              color: modalTypeFilter === t.id ? "#FFFFFF" : "#475569",
                              border: "none"
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </Card.Header>

                    <div className="p-2 border-bottom d-flex gap-2 bg-light">
                      <div className="bms-search-input-pill flex-grow-1 bg-white">
                        <Search className="bms-search-icon"  size="1em"/>
                        <input
                          type="text"
                          placeholder="Tìm thêm gói hoặc chỉ số xét nghiệm (CBC, GLU, ANTI-TPO...)..."
                          value={modalSearchTerm}
                          onChange={(e) => setModalSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="form-select form-select-sm rounded-pill"
                        style={{ width: "auto" }}
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                      >
                        <option value="Tất cả">Tất cả chuyên khoa</option>
                        <option value="Huyết học">Huyết học</option>
                        <option value="Sinh hóa">Sinh hóa</option>
                        <option value="Miễn dịch">Miễn dịch</option>
                      </select>
                    </div>

                    <div className="table-responsive" style={{ maxHeight: "230px" }}>
                      <table className="table table-hover table-sm align-middle mb-0">
                        <tbody>
                          {filteredModalCatalog.map((item) => {
                            const isSel = selectedCodes.has(item.code);
                            const isLocked = lockedCodes.has(item.code);
                            const tubeSpec = resolveTubeSpec(item.tubeType, item.category);
                            return (
                              <tr
                                key={item.code}
                                onClick={() => handleToggleCode(item.code)}
                                style={{
                                  cursor: isLocked || dispatchedOrderResult ? "default" : "pointer",
                                  backgroundColor: isSel ? "rgba(30, 96, 230, 0.08)" : undefined
                                }}
                              >
                                <td className="ps-3 text-center" style={{ width: 38 }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={isSel}
                                    disabled={isLocked || Boolean(dispatchedOrderResult)}
                                    onChange={() => handleToggleCode(item.code)}
                                  />
                                </td>
                                <td>
                                  <div className="fw-semibold text-dark small d-flex align-items-center gap-1.5">
                                    <span>{item.name}</span>
                                    {isLocked && (
                                      <Badge bg="success" pill style={{ fontSize: "0.66rem" }}>
                                        Đã đặt trước (Khóa)
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="small text-muted">
                                    <code className="text-primary me-2">{item.code}</code>
                                    <span style={{ color: tubeSpec.colorHex }}>{tubeSpec.shortLabel}</span>
                                  </div>
                                </td>
                                <td className="text-end pe-3 font-monospace fw-bold small text-nowrap">
                                  {Number(item.price || 0).toLocaleString("vi-VN")} đ
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* CỘT PHẢI MODAL (5 PHẦN): XEM TRƯỚC TÁCH ỐNG CLSI & SÀNG LỌC TIỀN PHÂN TÍCH */}
                <div className="col-lg-5">
                  <Card className="border-0 shadow-xs rounded-4 bg-white h-100">
                    <Card.Header className="bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                      <span className="fw-bold small text-dark text-uppercase d-flex align-items-center gap-1.5">
                        <Layers className="text-primary"  size="1em"/> 3. Tách Ống Máu &amp; Chuyển Lab
                      </span>
                      <Badge bg="primary" pill>{autoTubeGroups.length} ống mẫu</Badge>
                    </Card.Header>

                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                      <div>
                        {/* Danh sách ống máu CLSI tự tách */}
                        <div className="mb-3">
                          <div className="small fw-bold text-muted text-uppercase mb-1.5">
                            Ống bệnh phẩm hệ thống sẽ tự sinh cho Lab:
                          </div>
                          {autoTubeGroups.length === 0 ? (
                            <div className="p-3 rounded-3 bg-light border text-center text-muted small">
                              Chưa có xét nghiệm nào được chọn.
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-1.5">
                              {autoTubeGroups.map((g, idx) => (
                                <div
                                  key={g.key}
                                  className="p-2 rounded-3 bg-light border"
                                  style={{ borderLeft: `4px solid ${g.colorHex}` }}
                                >
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold small" style={{ color: g.colorHex }}>
                                      Ống #{idx + 1}: {g.label}
                                    </span>
                                    <span className="badge bg-white text-dark border rounded-pill" style={{ fontSize: "0.68rem" }}>
                                      {g.sampleType}
                                    </span>
                                  </div>
                                  <div className="small text-dark mt-1">
                                    {g.tests.map((t) => t.name).join(" • ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sàng lọc nhịn ăn */}
                        {fastingInfo.required && priority !== "STAT" && !dispatchedOrderResult && (
                          <div className="p-2.5 rounded-3 mb-3 border border-warning bg-warning-subtle">
                            <Form.Check
                              type="checkbox"
                              id="modal-fasting-check"
                              checked={fastingConfirmed}
                              onChange={(e) => setFastingConfirmed(e.target.checked)}
                              label={
                                <span className="small fw-semibold text-dark">
                                  Xác nhận: Bệnh nhân đã nhịn ăn đủ {fastingInfo.maxHours}h trước khi lấy mẫu.
                                </span>
                              }
                            />
                          </div>
                        )}
                      </div>

                      {/* Tổng chi phí & Tóm tắt chuyển */}
                      <div className="p-3 rounded-3 bg-light border">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-muted">Số mục xét nghiệm:</span>
                          <strong className="text-dark small">{selectedTests.length} mục</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-dark">Tổng chi phí chỉ định:</span>
                          <span className="fs-5 fw-bold font-monospace" style={{ color: "#1E60E6" }}>
                            {totalAmount.toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light border-top d-flex justify-content-between">
          <BsButton
            variant="secondary"
            size="sm"
            className="rounded-pill px-3"
            disabled={submitting}
            onClick={() => setActiveModalEncounter(null)}
          >
            {dispatchedOrderResult ? "Đóng & Quay lại danh sách" : "Đóng"}
          </BsButton>

          {/* ẨN HOÀN TOÀN NÚT CHUYỂN & LƯU NHÁP KHI ĐÃ CHUYỂN LAB THÀNH CÔNG */}
          {!dispatchedOrderResult && (
            <div className="d-flex align-items-center gap-2">
              <BsButton
                variant="outline-secondary"
                size="sm"
                className="rounded-pill px-3 fw-semibold"
                disabled={submitting || selectedTests.length === 0}
                onClick={() => handleDispatchToLab(true)}
              >
                <Save className="me-1"  size="1em"/> Lưu Bản Nháp
              </BsButton>

              <BsButton
                variant="primary"
                size="sm"
                className="rounded-pill px-4 py-1.5 fw-bold text-white shadow-sm d-flex align-items-center gap-2"
                style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                disabled={submitting || selectedTests.length === 0 || !bpValid}
                onClick={() => handleDispatchToLab(false)}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>Đang chuyển xuống Lab...</span>
                  </>
                ) : (
                  <>
                    <Send  size="1em"/>
                    <span>Ký &amp; Chuyển Xuống Phòng Lab</span>
                  </>
                )}
              </BsButton>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      {/* MODAL XÁC NHẬN HỦY CHỈ ĐỊNH TRƯỚC KHI LẤY MẪU */}
      <Modal show={Boolean(cancelTargetOrder)} onHide={() => setCancelTargetOrder(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-danger">
            Xác Nhận Hủy Chỉ Định #{cancelTargetOrder?.orderNumber || cancelTargetOrder?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-2">
            Bác sĩ chỉ có thể hủy chỉ định trước khi Phòng Lab lấy mẫu máu. Thao tác này sẽ được lưu vết trong Audit Log.
          </p>
          <Form.Control
            as="textarea"
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Nhập lý do hủy chỉ định..."
          />
        </Modal.Body>
        <Modal.Footer>
          <BsButton variant="light" size="sm" className="rounded-pill px-3" onClick={() => setCancelTargetOrder(null)}>
            Đóng
          </BsButton>
          <BsButton
            variant="danger"
            size="sm"
            className="rounded-pill px-3 fw-semibold"
            disabled={cancelBusy || !cancelReason.trim()}
            onClick={handleConfirmCancelOrder}
          >
            {cancelBusy ? "Đang hủy..." : "Xác nhận Hủy Chỉ Định"}
          </BsButton>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

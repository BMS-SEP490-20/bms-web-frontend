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
import { Search, ClipboardList, AlertTriangle, CheckCircle2, Save, User, Stethoscope, X as LucideX, Check as LucideCheck, RefreshCw, HeartPulse, Ban, Send, Megaphone, PackageCheck, Phone, Mail, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
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
import { getPatientById } from "../../../services/patientService";

const CLINICAL_ICD10_LIST = [
  { code: "E11.9", name: "Đái tháo đường typ 2 không biến chứng" },
  { code: "E10.9", name: "Đái tháo đường typ 1 không biến chứng" },
  { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)" },
  { code: "E78.5", name: "Rối loạn chuyển hóa lipid máu (Tăng mỡ máu)" },
  { code: "D50.9", name: "Thiếu máu do thiếu sắt không đặc hiệu" },
  { code: "D64.9", name: "Thiếu máu không đặc hiệu (Đánh giá công thức máu)" },
  { code: "D68.9", name: "Rối loạn đông máu không đặc hiệu (PT/INR, aPTT)" },
  { code: "D69.6", name: "Giảm tiểu cầu không đặc hiệu" },
  { code: "B18.1", name: "Viêm gan siêu vi B mạn không có tác nhân Delta" },
  { code: "B18.2", name: "Viêm gan siêu vi C mạn" },
  { code: "K76.0", name: "Gan nhiễm mỡ / Tăng men gan (AST, ALT, GGT)" },
  { code: "K74.6", name: "Xơ gan / Theo dõi chức năng gan" },
  { code: "K29.7", name: "Viêm dạ dày tá tràng" },
  { code: "E03.9", name: "Suy giáp không đặc hiệu (TSH, FT4)" },
  { code: "E05.9", name: "Cường giáp / Nhiễm độc giáp (Tầm soát tuyến giáp)" },
  { code: "M10.9", name: "Bệnh Gút (Gout) / Tăng Acid Uric máu" },
  { code: "N18.9", name: "Bệnh thận mạn / Đánh giá Ure, Creatinine, eGFR" },
  { code: "N39.0", name: "Nhiễm trùng đường tiết niệu" },
  { code: "J20.9", name: "Viêm phế quản cấp / Nhiễm trùng hô hấp" },
  { code: "R73.9", name: "Tăng đường huyết không đặc hiệu (Glucose, HbA1c)" },
  { code: "R74.0", name: "Tăng nồng độ transaminase (men gan) không đặc hiệu" },
  { code: "Z00.0", name: "Khám sức khỏe tổng quát định kỳ" },
  { code: "Z01.7", name: "Khám xét nghiệm cận lâm sàng" },
  { code: "Z34.9", name: "Theo dõi thai kỳ bình thường (Xét nghiệm tiền sản)" }
];

const ICD10_BY_CODE = Object.fromEntries(CLINICAL_ICD10_LIST.map((x) => [x.code, x.name]));

const normalizeViText = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const ICD10_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

const calculateAgeFromDob = (dob) => {
  if (!dob) return null;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const m = today.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
};

const formatDateVn = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN");
};

const formatGenderVn = (gender) => {
  const g = String(gender || "").trim().toLowerCase();
  if (g === "female" || g === "nữ" || g === "nu") return "Nữ";
  if (g === "male" || g === "nam") return "Nam";
  if (g === "other" || g === "khác") return "Khác";
  return gender || "—";
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

  const queryAppointmentId = searchParams.get("appointmentId") || searchParams.get("encounterId") || "";
  const queryPatientId = searchParams.get("patientId") || "";
  const queryPatientName = searchParams.get("patientName") || "";
  const queryPackageId = searchParams.get("packageId") || "";

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

  const [encounters, setEncounters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingWorklist, setLoadingWorklist] = useState(false);
  const [worklistError, setWorklistError] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [activeModalEncounter, setActiveModalEncounter] = useState(null);
  const [modalPatientDetail, setModalPatientDetail] = useState(null);
  const [loadingPatientDetail, setLoadingPatientDetail] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [lockedCodes, setLockedCodes] = useState(new Set());
  const [editingDraftId, setEditingDraftId] = useState(null);

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
  const [icdDropdownOpen, setIcdDropdownOpen] = useState(false);
  const [icdError, setIcdError] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [fastingConfirmed, setFastingConfirmed] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [dispatchedOrderResult, setDispatchedOrderResult] = useState(null);
  const [autoOpenedFromUrl, setAutoOpenedFromUrl] = useState(false);

  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("Bác sĩ điều chỉnh chỉ định trước khi lấy mẫu");
  const [cancelBusy, setCancelBusy] = useState(false);

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

      if (Array.isArray(rawApts)) {
        rawApts.forEach((a) => {
          const st = String(a.status || "").toLowerCase();

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

  const handleOpenClinicalModal = useCallback(
    async (enc) => {
      if (isOrderDispatched(enc.linkedOrder)) {
        return;
      }

      setActiveModalEncounter(enc);
      setModalPatientDetail(null);
      setModalError("");
      setDispatchedOrderResult(null);
      setIcdError("");
      setCustomIcdInput("");
      setPriority("Routine");
      setSpecialInstructions("");
      setFastingConfirmed(true);

      const preSet = new Set();
      const lockSet = new Set();
      const matchedPkg = resolveBookedPackageInCatalog(enc.packageCode, enc.packageName);
      if (matchedPkg) {
        preSet.add(matchedPkg.code);
        lockSet.add(matchedPkg.code);
      } else if (enc.packageCode) {
        preSet.add(String(enc.packageCode).trim().toUpperCase());
        lockSet.add(String(enc.packageCode).trim().toUpperCase());
      } else if (enc.packageName) {
        const fallbackCode = String(enc.packageName).trim().toUpperCase();
        preSet.add(fallbackCode);
        lockSet.add(fallbackCode);
      }

      if (isOrderDraft(enc.linkedOrder)) {
        const draft = enc.linkedOrder;
        setEditingDraftId(draft.orderNumber || draft.id);
        if (preSet.size === 0 && Array.isArray(draft.items) && draft.items.length > 0 && draft.items[0]?.testCode) {
          const code = String(draft.items[0].testCode).toUpperCase();
          preSet.add(code);
          lockSet.add(code);
        }
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

      if (enc.patientId) {
        setLoadingPatientDetail(true);
        try {
          const [patientRes, emrRes] = await Promise.all([
            getPatientById(enc.patientId).catch(() => null),
            medicalRecordApi.getPatientRecords(enc.patientId).catch(() => null)
          ]);

          const pData = patientRes?.data || patientRes || null;
          if (pData && (pData.id || pData.patientCode || pData.fullName)) {
            setModalPatientDetail(pData);
          }

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
              const rawText = String(latest.diagnosis || latest.chiefComplaint).trim();
              setClinicalIndication(
                rawText.startsWith("Theo bệnh án EMR")
                  ? rawText
                  : `Theo bệnh án EMR (${latest.recordCode || "mới nhất"}): ${rawText}`
              );
            }
          }
        } catch {
        } finally {
          setLoadingPatientDetail(false);
        }
      }
    },
    [resolveBookedPackageInCatalog]
  );

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

  const bpValid = useMemo(() => {
    const sys = Number(vitals.systolicBp);
    const dia = Number(vitals.diastolicBp);
    if (!sys || !dia) return true;
    return sys > dia + 15;
  }, [vitals.systolicBp, vitals.diastolicBp]);

  const selectedTests = useMemo(() => {
    const map = new Map();
    catalog.forEach((c) => {
      if (selectedCodes.has(c.code)) map.set(c.code, c);
    });

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

  const resolvedModalPatient = useMemo(() => {
    if (!activeModalEncounter) return null;
    const p = modalPatientDetail || {};
    const dob = p.dateOfBirth || p.dob || activeModalEncounter.dateOfBirth || "";
    const computedAge = calculateAgeFromDob(dob) ?? p.age ?? activeModalEncounter.patientAge;
    return {
      fullName: p.fullName || p.fullname || activeModalEncounter.patientName || "Bệnh nhân",
      patientId: p.patientCode || p.id || activeModalEncounter.patientId || "—",
      gender: formatGenderVn(p.gender || activeModalEncounter.patientGender),
      age: computedAge ? `${computedAge} tuổi` : "—",
      dateOfBirth: dob ? formatDateVn(dob) : "—",
      phone: p.phoneNumber || p.phone || activeModalEncounter.patientPhone || "—",
      email: p.email || activeModalEncounter.patientEmail || "—",
      identityNumber: p.identityNumber || p.cccd || "—",
      bloodType: p.bloodType || "Chưa xác định",
      address: p.address || "—",
      allergies: Array.isArray(p.allergies) ? p.allergies.filter(Boolean).join(", ") : (p.allergies || ""),
    };
  }, [activeModalEncounter, modalPatientDetail]);

  const filteredIcdOptions = useMemo(() => {
    const q = normalizeViText(customIcdInput);
    const available = CLINICAL_ICD10_LIST.filter((x) => !selectedIcdCodes.includes(x.code));
    if (!q) return available;
    return available.filter(
      (x) =>
        normalizeViText(x.code).includes(q) ||
        normalizeViText(x.name).includes(q)
    );
  }, [customIcdInput, selectedIcdCodes]);

  const handleAddIcd = (code) => {
    const upper = String(code || "").trim().toUpperCase();
    if (!ICD10_REGEX.test(upper)) {
      setIcdError(`Mã ICD-10 "${upper}" sai định dạng chuẩn WHO (VD: E11.9, I10, B18.1, Z00.0).`);
      return;
    }
    setIcdError("");
    if (!selectedIcdCodes.includes(upper)) {
      setSelectedIcdCodes([...selectedIcdCodes, upper]);
    }
    setCustomIcdInput("");
    setIcdDropdownOpen(false);
  };

  const handleSubmitIcdSearch = () => {
    const raw = customIcdInput.trim();
    if (!raw) return;
    const upper = raw.toUpperCase();
    if (ICD10_REGEX.test(upper)) {
      handleAddIcd(upper);
      return;
    }
    if (filteredIcdOptions.length > 0) {
      handleAddIcd(filteredIcdOptions[0].code);
      return;
    }
    setIcdError(`Không tìm thấy bệnh phù hợp với "${raw}". Hãy nhập mã chuẩn WHO ICD-10 (VD: E11.9, I10).`);
  };

  const handleRemoveIcd = (code) => {
    if (selectedIcdCodes.length <= 1) {
      setIcdError("Bắt buộc có ít nhất 1 mã bệnh WHO ICD-10.");
      return;
    }
    setIcdError("");
    setSelectedIcdCodes(selectedIcdCodes.filter((c) => c !== code));
  };

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

  const encounterPag = usePagination(filteredEncounters, 10);

  return (
    <div size="1em" className="w-100 py-1">

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
                encounterPag.paginatedItems.map((enc) => {
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
        <TablePagination
          page={encounterPag.page}
          totalPages={encounterPag.totalPages}
          totalItems={encounterPag.totalItems}
          pageSize={encounterPag.pageSize}
          onPageChange={encounterPag.setPage}
          onPageSizeChange={encounterPag.setPageSize}
          itemLabel="lượt khám"
        />
      </Card>

      <style>{`
        .bms-wide-order-modal {
          max-width: min(1360px, 95vw) !important;
          width: min(1360px, 95vw) !important;
        }
      `}</style>
      <Modal
        show={Boolean(activeModalEncounter)}
        onHide={() => {
          if (!submitting) setActiveModalEncounter(null);
        }}
        dialogClassName="bms-wide-order-modal"
        centered
        backdrop="static"
        contentClassName="border-0 overflow-hidden"
      >
        <Modal.Header
          closeButton={!submitting}
          style={{
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            padding: "20px 28px",
          }}
        >
          <div style={{ minWidth: 0, width: "100%", paddingRight: "16px" }}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Stethoscope size={18} style={{ color: "#1E60E6", flexShrink: 0 }} />
              <span style={{ fontSize: "17px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
                Chỉ Định Xét Nghiệm
              </span>
              {activeModalEncounter && (
                <span
                  className="font-monospace"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1E60E6",
                    backgroundColor: "#EFF6FF",
                    padding: "3px 10px",
                    borderRadius: "999px",
                  }}
                >
                  {activeModalEncounter.appointmentCode}
                </span>
              )}
              {editingDraftId && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#B45309",
                    backgroundColor: "#FFFBEB",
                    padding: "3px 10px",
                    borderRadius: "999px",
                  }}
                >
                  Bản nháp #{editingDraftId}
                </span>
              )}
            </div>

            {activeModalEncounter && (
              <div
                className="d-flex align-items-center flex-wrap gap-2 mt-1"
                style={{ fontSize: "12.5px", color: "#64748B" }}
              >
                <span>STT: <strong className="font-monospace" style={{ color: "#1E60E6" }}>{activeModalEncounter.queueNumber}</strong></span>
                <span>·</span>
                <span>Phòng khám: <strong style={{ color: "#334155" }}>{activeModalEncounter.roomId || "ROOM-101"}</strong></span>
                <span>·</span>
                <span>Bác sĩ phụ trách: <strong style={{ color: "#334155" }}>{doctorName}</strong></span>
              </div>
            )}
          </div>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: "#F8FAFC", padding: "22px 28px", maxHeight: "80vh", overflowY: "auto" }}>
          {modalError && (
            <Alert variant="danger" dismissible onClose={() => setModalError("")} className="py-2 px-3 mb-3 rounded-3 small">
              <AlertTriangle className="me-2" size="1em" />
              {modalError}
            </Alert>
          )}

          {dispatchedOrderResult && (
            <div
              className="d-flex align-items-center gap-3 mb-3"
              style={{
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#065F46",
              }}
            >
              <CheckCircle2 size={22} style={{ color: "#059669", flexShrink: 0 }} />
              <div style={{ fontSize: "14px", fontWeight: 700 }}>
                Đã ký &amp; chuyển chỉ định #{dispatchedOrderResult.orderNumber || dispatchedOrderResult.id} xuống Phòng Lab thành công!
              </div>
            </div>
          )}

          {activeModalEncounter && resolvedModalPatient && (
            <>

              <div
                className="mb-3"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "16px",
                  padding: "16px 20px",
                }}
              >
                <div
                  className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-2 mb-3"
                  style={{ borderBottom: "1px solid #F1F5F9" }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <User size={15} style={{ color: "#1E60E6" }} />
                    1. Thông Tin Bệnh Nhân
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    {loadingPatientDetail && (
                      <span className="text-muted" style={{ fontSize: "11.5px" }}>
                        <Spinner animation="border" size="sm" className="me-1 text-primary" />
                        Đang đồng bộ hồ sơ...
                      </span>
                    )}
                    <span
                      className="font-monospace"
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#1E60E6",
                        backgroundColor: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        padding: "2px 10px",
                        borderRadius: "999px",
                      }}
                    >
                      {resolvedModalPatient.patientId}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
                    gap: "12px 18px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Họ và tên
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                      {resolvedModalPatient.fullName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Giới tính · Tuổi (Ngày sinh)
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={13} style={{ color: "#64748B" }} />
                      {resolvedModalPatient.gender} · {resolvedModalPatient.age}
                      {resolvedModalPatient.dateOfBirth !== "—" ? ` (${resolvedModalPatient.dateOfBirth})` : ""}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Số điện thoại
                    </div>
                    <div className="font-monospace" style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Phone size={13} style={{ color: "#64748B" }} />
                      {resolvedModalPatient.phone}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Email nhận kết quả
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "5px", wordBreak: "break-all" }}>
                      <Mail size={13} style={{ color: "#64748B", flexShrink: 0 }} />
                      {resolvedModalPatient.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      CCCD / CMND
                    </div>
                    <div className="font-monospace" style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <CreditCard size={13} style={{ color: "#64748B" }} />
                      {resolvedModalPatient.identityNumber}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Nhóm máu
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", marginTop: "2px" }}>
                      {resolvedModalPatient.bloodType}
                    </div>
                  </div>
                </div>

                {resolvedModalPatient.allergies && (
                  <div
                    className="mt-2.5 px-3 py-1.5 rounded-3 d-inline-flex align-items-center gap-1.5"
                    style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: "12px", fontWeight: 600 }}
                  >
                    <AlertTriangle size={13} />
                    <span>Tiền sử dị ứng: {resolvedModalPatient.allergies}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
                  gap: "22px",
                  alignItems: "start",
                }}
              >

                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "20px 22px",
                    minWidth: 0,
                  }}
                >
                  <div
                    className="d-flex justify-content-between align-items-center pb-2.5 mb-3"
                    style={{ borderBottom: "1px solid #F1F5F9" }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <HeartPulse size={15} style={{ color: "#EF4444" }} />
                      2. Khám Lâm Sàng &amp; Chẩn Đoán
                    </span>
                  <Form.Check
                    type="switch"
                    id="save-emr-switch"
                    label={<span style={{ fontSize: "12px", fontWeight: 600, color: "#1E60E6" }}>Lưu EMR</span>}
                    checked={saveToEmr}
                    disabled={Boolean(dispatchedOrderResult)}
                    onChange={(e) => setSaveToEmr(e.target.checked)}
                    className="mb-0"
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.35fr 1fr 1fr",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      Mạch (bpm)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: "36px", padding: "0 10px", fontSize: "13.5px", fontWeight: 600 }}
                      value={vitals.heartRate}
                      disabled={Boolean(dispatchedOrderResult)}
                      onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      Huyết áp (mmHg)
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "36px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #DDE3EA",
                        borderRadius: "10px",
                        padding: "0 6px",
                        gap: "4px",
                      }}
                    >
                      <input
                        type="number"
                        style={{
                          width: "100%",
                          minWidth: 0,
                          border: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: "#0F172A",
                          outline: "none",
                          height: "100%",
                        }}
                        value={vitals.systolicBp}
                        disabled={Boolean(dispatchedOrderResult)}
                        onChange={(e) => setVitals({ ...vitals, systolicBp: e.target.value })}
                      />
                      <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: "13px" }}>/</span>
                      <input
                        type="number"
                        style={{
                          width: "100%",
                          minWidth: 0,
                          border: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: "#0F172A",
                          outline: "none",
                          height: "100%",
                        }}
                        value={vitals.diastolicBp}
                        disabled={Boolean(dispatchedOrderResult)}
                        onChange={(e) => setVitals({ ...vitals, diastolicBp: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      Nhiệt độ (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      style={{ height: "36px", padding: "0 10px", fontSize: "13.5px", fontWeight: 600 }}
                      value={vitals.temperature}
                      disabled={Boolean(dispatchedOrderResult)}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      SpO2 (%)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ height: "36px", padding: "0 10px", fontSize: "13.5px", fontWeight: 600 }}
                      value={vitals.spo2}
                      disabled={Boolean(dispatchedOrderResult)}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    />
                  </div>
                </div>

                {!bpValid && (
                  <div className="text-danger small mb-2.5 fw-semibold">
                    Huyết áp tâm thu phải lớn hơn huyết áp tâm trương ít nhất 15 mmHg.
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>

                  <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-1 mb-1.5">
                    <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
                      Chẩn đoán mã bệnh ICD-10 <span className="text-danger">*</span>
                    </label>
                  </div>

                  {!dispatchedOrderResult && (
                    <div style={{ position: "relative", marginBottom: "8px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <Search
                            size={14}
                            style={{
                              position: "absolute",
                              left: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#94A3B8",
                              pointerEvents: "none",
                            }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            style={{
                              height: "38px",
                              paddingLeft: "34px",
                              paddingRight: customIcdInput ? "30px" : "12px",
                              fontSize: "13px",
                              borderRadius: "10px",
                              borderColor: icdDropdownOpen ? "#1E60E6" : "#CBD5E1",
                            }}
                            placeholder="Tìm theo mã (E11, D50, B18.1...) hoặc tên bệnh (tiểu đường, thiếu máu, viêm gan)..."
                            value={customIcdInput}
                            onFocus={() => setIcdDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIcdDropdownOpen(false), 160)}
                            onChange={(e) => {
                              setCustomIcdInput(e.target.value);
                              setIcdDropdownOpen(true);
                              if (icdError) setIcdError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSubmitIcdSearch();
                              } else if (e.key === "Escape") {
                                setIcdDropdownOpen(false);
                              }
                            }}
                          />
                          {customIcdInput && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setCustomIcdInput("")}
                              style={{
                                position: "absolute",
                                right: "8px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                border: "none",
                                background: "transparent",
                                color: "#94A3B8",
                                padding: "2px",
                                cursor: "pointer",
                                display: "inline-flex",
                              }}
                              aria-label="Xóa từ khóa tìm kiếm"
                            >
                              <LucideX size={13} />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleSubmitIcdSearch}
                          disabled={!customIcdInput.trim()}
                          style={{
                            height: "38px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #BFDBFE",
                            backgroundColor: customIcdInput.trim() ? "#1E60E6" : "#EFF6FF",
                            color: customIcdInput.trim() ? "#FFFFFF" : "#1E60E6",
                            fontWeight: 600,
                            fontSize: "12.5px",
                            whiteSpace: "nowrap",
                            cursor: customIcdInput.trim() ? "pointer" : "not-allowed",
                          }}
                        >
                          + Thêm mã
                        </button>
                      </div>

                      {icdDropdownOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: "42px",
                            left: 0,
                            right: 0,
                            zIndex: 40,
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #CBD5E1",
                            borderRadius: "12px",
                            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
                            maxHeight: "220px",
                            overflowY: "auto",
                            padding: "4px",
                          }}
                        >
                          {filteredIcdOptions.length > 0 ? (
                            filteredIcdOptions.map((icd) => (
                              <button
                                key={icd.code}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleAddIcd(icd.code);
                                }}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  padding: "7px 10px",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  fontSize: "12.5px",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EFF6FF"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                              >
                                <span
                                  className="font-monospace fw-bold"
                                  style={{
                                    color: "#1E60E6",
                                    backgroundColor: "#EFF6FF",
                                    border: "1px solid #DBEAFE",
                                    padding: "1px 7px",
                                    borderRadius: "6px",
                                    fontSize: "11.5px",
                                    minWidth: "56px",
                                    textAlign: "center",
                                  }}
                                >
                                  {icd.code}
                                </span>
                                <span style={{ color: "#1E293B", fontWeight: 500 }}>{icd.name}</span>
                              </button>
                            ))
                          ) : ICD10_REGEX.test(customIcdInput.trim().toUpperCase()) ? (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddIcd(customIcdInput.trim().toUpperCase());
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                border: "none",
                                background: "#F0FDF4",
                                color: "#166534",
                                padding: "8px 10px",
                                borderRadius: "8px",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              + Thêm mã ICD-10 ngoài danh mục: <span className="font-monospace">{customIcdInput.trim().toUpperCase()}</span>
                            </button>
                          ) : (
                            <div style={{ padding: "10px 12px", fontSize: "12px", color: "#64748B" }}>
                              Không có bệnh khớp từ khóa. Nhập đúng mã chuẩn WHO ICD-10 (VD: <code>A09</code>, <code>E11.9</code>) rồi bấm <strong>Enter</strong>.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {icdError && <div className="text-danger small mb-1.5 fw-medium">{icdError}</div>}

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedIcdCodes.map((code) => {
                      const diseaseName = ICD10_BY_CODE[code] || "Mã chẩn đoán ICD-10 bổ sung";
                      return (
                        <div
                          key={code}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "7px 10px",
                            borderRadius: "10px",
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                            <span
                              className="font-monospace fw-bold"
                              style={{
                                fontSize: "12px",
                                color: "#1E60E6",
                                backgroundColor: "#EFF6FF",
                                border: "1px solid #DBEAFE",
                                padding: "1px 8px",
                                borderRadius: "6px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {code}
                            </span>
                            <span
                              style={{
                                fontSize: "12.5px",
                                color: "#334155",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={`${code} — ${diseaseName}`}
                            >
                              — {diseaseName}
                            </span>
                          </div>

                          {!dispatchedOrderResult && (
                            <button
                              type="button"
                              onClick={() => handleRemoveIcd(code)}
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: "2px",
                                display: "inline-flex",
                                color: "#64748B",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                              aria-label={`Xóa mã ${code}`}
                              title={`Xóa mã ${code}`}
                            >
                              <LucideX size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                    Triệu chứng &amp; Chẩn đoán lâm sàng <span className="text-danger">*</span>
                  </label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    style={{ fontSize: "13px", lineHeight: 1.5, padding: "10px 12px" }}
                    disabled={Boolean(dispatchedOrderResult)}
                    value={clinicalIndication}
                    onChange={(e) => setClinicalIndication(e.target.value)}
                    placeholder="Ghi ngắn gọn triệu chứng lâm sàng, lý do chỉ định xét nghiệm..."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      Độ ưu tiên
                    </label>
                    <select
                      className="form-select"
                      style={{ height: "36px", fontSize: "13px" }}
                      disabled={Boolean(dispatchedOrderResult)}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="Routine">Thường quy (Routine)</option>
                      <option value="Urgent">Khẩn (Urgent)</option>
                      <option value="STAT">Cấp cứu (STAT)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "5px" }}>
                      Ghi chú cho Phòng Lab
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: "36px", fontSize: "13px" }}
                      disabled={Boolean(dispatchedOrderResult)}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Lưu ý lấy mẫu, kháng đông..."
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="d-flex justify-content-between align-items-center flex-wrap gap-2"
                    style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A", display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <PackageCheck size={15} style={{ color: "#059669" }} />
                      3. Gói Dịch Vụ Bệnh Nhân Đã Đặt
                    </span>
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#047857",
                        backgroundColor: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <ShieldCheck size={12} />
                      Cố định theo lịch hẹn
                    </span>
                  </div>

                  <div style={{ padding: "16px 18px" }}>
                    {selectedTests.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          backgroundColor: "#F8FAFC",
                          border: "1px dashed #CBD5E1",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "#64748B",
                        }}
                      >
                        Lịch hẹn này chưa gắn gói dịch vụ xét nghiệm cụ thể.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {selectedTests.map((item) => (
                          <div
                            key={item.code}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "12px",
                              padding: "14px 16px",
                              borderRadius: "12px",
                              backgroundColor: "#F0F7FF",
                              border: "1px solid #BFDBFE",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", lineHeight: 1.35 }}>
                                  {item.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#047857",
                                    backgroundColor: "#ECFDF5",
                                    border: "1px solid #A7F3D0",
                                    padding: "1px 8px",
                                    borderRadius: "999px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Đã đặt
                                </span>
                              </div>
                              <div className="d-flex align-items-center flex-wrap gap-2 mt-1.5" style={{ fontSize: "12px", color: "#475569" }}>
                                <code style={{ color: "#1E60E6", fontWeight: 700 }}>{item.code}</code>
                                {item.category && (
                                  <>
                                    <span>·</span>
                                    <span>{item.category}</span>
                                  </>
                                )}
                                {item.turnaroundTime && (
                                  <>
                                    <span>·</span>
                                    <span>Thời gian trả KQ dự kiến: <strong>{item.turnaroundTime}</strong></span>
                                  </>
                                )}
                              </div>
                              {item.preparationNotes && (
                                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "6px" }}>
                                  Lưu ý chuẩn bị: {item.preparationNotes}
                                </div>
                              )}
                            </div>
                            <div
                              className="font-monospace"
                              style={{
                                fontSize: "15px",
                                fontWeight: 800,
                                color: "#1E60E6",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {Number(item.price || 0).toLocaleString("vi-VN")} đ
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className="mt-3"
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        padding: "9px 12px",
                      }}
                    >
                      Hệ thống tự động nạp đúng gói dịch vụ bệnh nhân đã đăng ký theo lịch hẹn (không chọn thêm gói hoặc dịch vụ ngoài). Việc phân loại và sinh ống bệnh phẩm sẽ do Phòng Lab thực hiện khi tiếp nhận lấy mẫu.
                    </div>

                    {fastingInfo.required && priority !== "STAT" && !dispatchedOrderResult && (
                      <div
                        className="mt-3"
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          backgroundColor: "#FFFBEB",
                          border: "1px solid #FDE68A",
                        }}
                      >
                        <Form.Check
                          type="checkbox"
                          id="modal-fasting-check"
                          checked={fastingConfirmed}
                          onChange={(e) => setFastingConfirmed(e.target.checked)}
                          className="mb-0"
                          label={
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#92400E" }}>
                              Xác nhận bệnh nhân đã nhịn ăn đủ {fastingInfo.maxHours}h trước khi lấy mẫu
                            </span>
                          }
                        />
                      </div>
                    )}

                    <div
                      className="d-flex justify-content-between align-items-center pt-3 mt-3"
                      style={{ borderTop: "1px solid #F1F5F9" }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>Tổng chi phí gói dịch vụ</div>
                        <div style={{ fontSize: "11.5px", color: "#64748B" }}>{selectedTests.length} gói xét nghiệm đã đặt</div>
                      </div>
                      <div
                        className="font-monospace"
                        style={{ fontSize: "20px", fontWeight: 800, color: "#1E60E6", letterSpacing: "-0.02em" }}
                      >
                        {totalAmount.toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer
          className="d-flex justify-content-between align-items-center"
          style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "14px 24px" }}
        >
          <BsButton
            variant="secondary"
            size="sm"
            className="rounded-pill px-3.5"
            disabled={submitting}
            onClick={() => setActiveModalEncounter(null)}
          >
            {dispatchedOrderResult ? "Đóng & Quay lại danh sách" : "Đóng"}
          </BsButton>

          {!dispatchedOrderResult && (
            <div className="d-flex align-items-center gap-2">
              <BsButton
                variant="outline-secondary"
                size="sm"
                className="rounded-pill px-3.5 fw-semibold d-inline-flex align-items-center gap-1.5"
                disabled={submitting || selectedTests.length === 0}
                onClick={() => handleDispatchToLab(true)}
              >
                <Save size={14} /> Lưu Bản Nháp
              </BsButton>

              <BsButton
                variant="primary"
                size="sm"
                className="rounded-pill px-4 py-1.5 fw-bold text-white d-inline-flex align-items-center gap-2"
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
                    <Send size={14} />
                    <span>Ký &amp; Chuyển Xuống Phòng Lab</span>
                  </>
                )}
              </BsButton>
            </div>
          )}
        </Modal.Footer>
      </Modal>

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

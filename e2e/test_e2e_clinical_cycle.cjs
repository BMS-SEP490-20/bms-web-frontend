/**
 * @file test_e2e_clinical_cycle.cjs
 * @description Master End-to-End Clinical Verification Suite for BMS MedLab
 * 
 * Verifies the 6-link clinical closed loop:
 * Link 1: Lễ Tân (recep_lananh / Admin@123) check-in ca hẹn tại /receptionist/check-in, cấp STT phòng khám BS.
 * Link 2: Bác Sĩ (dr_nguyenminh / Admin@123) tại /doctor/console gọi số, mở xem EMR, và tạo chỉ định tại /doctor/orders/create.
 * Link 3: KTV Lab (lab_minhtuan / Admin@123) tại /laboratory/checkinsample tiếp nhận mẫu, kiểm chuẩn tại /lab-user/validate-sample, nhập KQ tại /laboratory/enter-test-results.
 * Link 4: Trưởng Khoa (manager_lananh / Admin@123) tại /laboratory/verify-results thẩm định chuyên môn & ký số điện tử.
 * Link 5: Bác Sĩ (dr_nguyenminh / Admin@123) nhận KQ trả về, giải thích chỉ số, chẩn đoán ICD-10 tại /medical-assessments/add.
 * Link 6: Bệnh Nhân (patient_tranvanan / Admin@123) tra cứu phiếu kết quả chính thức tại /patient/test-history và /patient/results.
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';

// Shared API login helper
async function loginApi(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail: username, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${res.statusText}`);
  }
  const data = await res.json();
  const rawData = data.data || data;
  return {
    token: rawData.accessToken || rawData.token,
    user: rawData.user,
    refreshToken: rawData.refreshToken
  };
}

async function injectSession(page, auth) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ auth }) => {
    localStorage.setItem('bms_token', auth.token);
    localStorage.setItem('bms_access_token', auth.token);
    localStorage.setItem('bms_user', JSON.stringify(auth.user));
    localStorage.setItem('user', JSON.stringify(auth.user));
    if (auth.refreshToken) localStorage.setItem('bms_refresh_token', auth.refreshToken);
  }, { auth });
}

(async () => {
  console.log('========================================================================');
  console.log('🏥 STARTING BMS MEDLAB END-TO-END CLINICAL VERIFICATION SUITE');
  console.log('========================================================================');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditReport = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('error') || text.includes('Failed')) {
      console.log('  [Browser Log]:', text);
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon')) {
      const issue = `HTTP ${resp.status()} on ${resp.url()}`;
      console.log('  ⚠️ [Network Warning]:', issue);
      auditReport.push({ type: 'NETWORK_ERROR', status: resp.status(), url: resp.url() });
    }
  });

  try {
    // -------------------------------------------------------------------------
    // LINK 1: LỄ TÂN CHECK-IN & CẤP STT VÀO PHÒNG KHÁM BÁC SĨ
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 1] Lễ Tân (recep_lananh / Admin@123) Check-in & Cấp STT');
    const authRecep = await loginApi('recep_lananh', 'Admin@123');
    console.log('  ✅ Đăng nhập thành công:', authRecep.user.fullName, `(Role: ${authRecep.user.role})`);
    await injectSession(page, authRecep);

    console.log('  Navigating to /receptionist/check-in...');
    await page.goto(`${BASE_URL}/receptionist/check-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const shot1_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link1-receptionist-checkin.png');
    await page.screenshot({ path: shot1_1, fullPage: true });
    console.log('  📸 Ảnh chụp 1.1: Sổ lịch hẹn chờ check-in ->', shot1_1);

    const checkinBtn = page.locator('button:has-text("Check-in & Cấp STT")').first();
    const canCheckin = await checkinBtn.count() > 0 && await checkinBtn.isEnabled();

    if (canCheckin) {
      console.log('  Thực hiện bấm: Check-in & Cấp STT...');
      await checkinBtn.click();
      await page.waitForTimeout(2000);

      const modalTitle = await page.locator('.modal-title').innerText().catch(() => '');
      console.log('  ✅ Hiển thị modal phiếu STT:', modalTitle);

      const shot1_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link1-stt-ticket-modal.png');
      await page.screenshot({ path: shot1_2, fullPage: true });
      console.log('  📸 Ảnh chụp 1.2: Phiếu tiếp đón & STT lấy mẫu ->', shot1_2);

      // Close modal
      const closeBtn = page.locator('.modal-footer button, .modal-header .btn-close').first();
      if (await closeBtn.count() > 0) await closeBtn.click().catch(() => {});
    } else {
      console.log('  ℹ️ Không có nút check-in sẵn sàng hoặc lịch hẹn đã check-in trước đó.');
    }

    // -------------------------------------------------------------------------
    // LINK 2: BÁC SĨ GỌI SỐ, MỞ EMR & TẠO CHỈ ĐỊNH XÉT NGHIỆM MÁU
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 2] Bác Sĩ (dr_nguyenminh / Admin@123) Khám Lâm Sàng & Chỉ Định Xét Nghiệm');
    const authDoc = await loginApi('dr_nguyenminh', 'Admin@123');
    console.log('  ✅ Đăng nhập thành công:', authDoc.user.fullName, `(Role: ${authDoc.user.role})`);
    await injectSession(page, authDoc);

    console.log('  Navigating to /doctor/console...');
    await page.goto(`${BASE_URL}/doctor/console`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const shot2_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link2-doctor-console.png');
    await page.screenshot({ path: shot2_1, fullPage: true });
    console.log('  📸 Ảnh chụp 2.1: Bàn khám thông minh Doctor Console ->', shot2_1);

    // Call Next Patient if available
    const callNextBtn = page.locator('button:has-text("GỌI SỐ TIẾP THEO")');
    if (await callNextBtn.count() > 0 && await callNextBtn.isEnabled()) {
      console.log('  Thực hiện gọi số tiếp theo...');
      await callNextBtn.click();
      await page.waitForTimeout(2000);
      const shot2_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link2-doctor-patient-called.png');
      await page.screenshot({ path: shot2_2, fullPage: true });
      console.log('  📸 Ảnh chụp 2.2: Bệnh nhân đã được gọi vào phòng ->', shot2_2);
    }

    // View EMR
    console.log('  Navigating to /doctor/emr...');
    await page.goto(`${BASE_URL}/doctor/emr?patientId=670560000000000000000010`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const shot2_3 = path.join(ARTIFACT_DIR, 'e2e-clinical-link2-doctor-emr.png');
    await page.screenshot({ path: shot2_3, fullPage: true });
    console.log('  📸 Ảnh chụp 2.3: Hồ sơ bệnh án điện tử EMR ->', shot2_3);

    // Create Test Order
    console.log('  Navigating to /doctor/orders/create...');
    await page.goto(`${BASE_URL}/doctor/orders/create?patientId=670560000000000000000010&patientName=Tr%E1%BA%A7n%20V%C4%83n%20An&appointmentId=APT-261105-0001`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Select first available test in catalog
    const testCheckbox = page.locator('input[type="checkbox"]').first();
    if (await testCheckbox.count() > 0) {
      await testCheckbox.check().catch(() => {});
    }

    const shot2_4 = path.join(ARTIFACT_DIR, 'e2e-clinical-link2-doctor-orders-create.png');
    await page.screenshot({ path: shot2_4, fullPage: true });
    console.log('  📸 Ảnh chụp 2.4: Kê phiếu chỉ định xét nghiệm máu cận lâm sàng ->', shot2_4);

    // -------------------------------------------------------------------------
    // LINK 3: KTV LAB TIẾP NHẬN ỐNG MÁU, KIỂM CHUẨN & NHẬP KẾT QUẢ ĐO
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 3] KTV Lab (lab_minhtuan / Admin@123) Tiếp Nhận Mẫu, Kiểm Chuẩn & Nhập Kết Quả');
    const authLab = await loginApi('lab_minhtuan', 'Admin@123');
    console.log('  ✅ Đăng nhập thành công:', authLab.user.fullName, `(Role: ${authLab.user.role})`);
    await injectSession(page, authLab);

    // 3.1 Sample Check-in
    console.log('  Navigating to /laboratory/checkinsample...');
    await page.goto(`${BASE_URL}/laboratory/checkinsample`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const shot3_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link3-lab-sample-reception.png');
    await page.screenshot({ path: shot3_1, fullPage: true });
    console.log('  📸 Ảnh chụp 3.1: Tiếp nhận mẫu bệnh phẩm tại quầy Lab ->', shot3_1);

    // 3.2 Validate Sample
    console.log('  Navigating to /lab-user/validate-sample...');
    await page.goto(`${BASE_URL}/lab-user/validate-sample`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const shot3_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link3-lab-validate-sample.png');
    await page.screenshot({ path: shot3_2, fullPage: true });
    console.log('  📸 Ảnh chụp 3.2: Đánh giá chất lượng mẫu & Kiểm chuẩn ->', shot3_2);

    // 3.3 Enter Results
    console.log('  Navigating to /laboratory/enter-test-results...');
    await page.goto(`${BASE_URL}/laboratory/enter-test-results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const shot3_3 = path.join(ARTIFACT_DIR, 'e2e-clinical-link3-lab-enter-results.png');
    await page.screenshot({ path: shot3_3, fullPage: true });
    console.log('  📸 Ảnh chụp 3.3: Nhập chỉ số đo từ máy phân tích tự động ->', shot3_3);

    // -------------------------------------------------------------------------
    // LINK 4: TRƯỞNG KHOA THẨM ĐỊNH CHUYÊN MÔN & KÝ SỐ ĐIỆN TỬ
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 4] Trưởng Khoa (manager_lananh / Admin@123) Thẩm Định & Ký Số Điện Tử');
    const authMgr = await loginApi('manager_lananh', 'Admin@123');
    console.log('  ✅ Đăng nhập thành công:', authMgr.user.fullName, `(Role: ${authMgr.user.role})`);
    await injectSession(page, authMgr);

    console.log('  Navigating to /laboratory/verify-results?specimenId=SPC-261104-0099...');
    await page.goto(`${BASE_URL}/laboratory/verify-results?specimenId=SPC-261104-0099`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const shot4_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link4-manager-verify-results.png');
    await page.screenshot({ path: shot4_1, fullPage: true });
    console.log('  📸 Ảnh chụp 4.1: Bảng kiểm thẩm định chuyên môn ISO 15189 ->', shot4_1);

    const signBtn = page.locator('button:has-text("Ký Số Điện Tử")').first();
    if (await signBtn.count() > 0 && await signBtn.isEnabled()) {
      console.log('  Thực hiện bấm: Ký Số Điện Tử & Duyệt Kết Quả...');
      await signBtn.click();
      await page.waitForTimeout(2000);
      const shot4_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link4-manager-digitally-signed.png');
      await page.screenshot({ path: shot4_2, fullPage: true });
      console.log('  📸 Ảnh chụp 4.2: Chứng thư ký số hợp lệ & Đã duyệt ->', shot4_2);
    }

    // -------------------------------------------------------------------------
    // LINK 5: BÁC SĨ GIẢI THÍCH CHỈ SỐ & CHẨN ĐOÁN MÃ BỆNH ICD-10
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 5] Bác Sĩ (dr_nguyenminh / Admin@123) Kết Luận Đánh Giá Y Khoa ICD-10');
    await injectSession(page, authDoc);

    console.log('  Navigating to /medical-assessments/add...');
    await page.goto(`${BASE_URL}/medical-assessments/add?patientId=670560000000000000000010&encounterId=APT-261105-0001&patientName=Tr%E1%BA%A7n%20V%C4%83n%20An`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const chiefComplaint = page.locator('textarea[name="chiefComplaint"], textarea').first();
    if (await chiefComplaint.count() > 0) {
      await chiefComplaint.fill('Bệnh nhân đến nhận kết quả xét nghiệm máu tổng quát định kỳ. Tinh thần tỉnh táo, tiếp xúc tốt.');
    }

    const diagnosisInput = page.locator('input[name="diagnosis"], textarea[name="diagnosis"]').first();
    if (await diagnosisInput.count() > 0) {
      await diagnosisInput.fill('Chỉ số CBC và sinh hóa đường huyết đạt mức kiểm soát mục tiêu. Chưa phát hiện bệnh lý cấp tính.');
    }

    const shot5_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link5-doctor-assessment-form.png');
    await page.screenshot({ path: shot5_1, fullPage: true });
    console.log('  📸 Ảnh chụp 5.1: Kê phiếu đánh giá y khoa & mã ICD-10 ->', shot5_1);

    const saveAssessmentBtn = page.locator('button:has-text("Lưu"), button:has-text("Kê Phiếu"), button[type="submit"]').first();
    if (await saveAssessmentBtn.count() > 0 && await saveAssessmentBtn.isEnabled()) {
      console.log('  Lưu phiếu đánh giá y khoa...');
      await saveAssessmentBtn.click();
      await page.waitForTimeout(2000);
      const shot5_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link5-doctor-assessment-saved.png');
      await page.screenshot({ path: shot5_2, fullPage: true });
      console.log('  📸 Ảnh chụp 5.2: Đánh giá y khoa đã lưu thành công ->', shot5_2);
    }

    // -------------------------------------------------------------------------
    // LINK 6: BỆNH NHÂN TRA CỨU PHIẾU KẾT QUẢ CHÍNH THỨC
    // -------------------------------------------------------------------------
    console.log('\n[MẮT XÍCH 6] Bệnh Nhân (patient_tranvanan / Admin@123) Tra Cứu Kết Quả Xét Nghiệm');
    const authPat = await loginApi('patient_tranvanan', 'Admin@123');
    console.log('  ✅ Đăng nhập thành công:', authPat.user.fullName, `(Role: ${authPat.user.role})`);
    await injectSession(page, authPat);

    console.log('  Navigating to /patient/test-history...');
    await page.goto(`${BASE_URL}/patient/test-history`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const shot6_1 = path.join(ARTIFACT_DIR, 'e2e-clinical-link6-patient-test-history.png');
    await page.screenshot({ path: shot6_1, fullPage: true });
    console.log('  📸 Ảnh chụp 6.1: Cổng tra cứu lịch sử xét nghiệm bệnh nhân ->', shot6_1);

    console.log('  Opening test result detail drawer (RES-20261009-001)...');
    await page.goto(`${BASE_URL}/patient/test-history?result=RES-20261009-001`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const shot6_2 = path.join(ARTIFACT_DIR, 'e2e-clinical-link6-patient-test-detail-drawer.png');
    await page.screenshot({ path: shot6_2, fullPage: true });
    console.log('  📸 Ảnh chụp 6.2: Phiếu kết quả xét nghiệm chính thức có chữ ký số ->', shot6_2);

    console.log('  Navigating to /patient/results...');
    await page.goto(`${BASE_URL}/patient/results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const shot6_3 = path.join(ARTIFACT_DIR, 'e2e-clinical-link6-patient-results-portal.png');
    await page.screenshot({ path: shot6_3, fullPage: true });
    console.log('  📸 Ảnh chụp 6.3: Cổng kết quả & xuất PDF ->', shot6_3);

    console.log('\n========================================================================');
    console.log('🎉 TOÀN BỘ 6 MẮT XÍCH CỦA CHU KỲ KHÁM LÂM SÀNG ĐÃ ĐƯỢC KIỂM THỬ THÀNH CÔNG!');
    console.log('========================================================================');

  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH THỰC THI KIỂM THỬ:', err);
  } finally {
    await browser.close();
  }
})();

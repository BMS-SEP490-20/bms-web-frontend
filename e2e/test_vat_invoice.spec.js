import { test, expect } from '@playwright/test';

test('Verify standard Electronic VAT Invoice form (Thông tư 78/2021/TT-BTC)', async ({ page }) => {
  page.setViewportSize({ width: 1440, height: 1350 });

  // 1. Authenticate as patient
  const mockUser = {
    id: 'USR-PAT-01',
    fullName: 'Trần Văn An',
    username: 'patient',
    roleId: 6,
    role: 'PATIENT',
    roleName: 'PATIENT',
    patientCode: 'PAT-079201009988',
    citizenId: '079201009988',
    roles: ['PATIENT']
  };

  await page.goto('http://localhost:3000/patient/payment-history', { waitUntil: 'commit' });
  await page.evaluate((u) => {
    localStorage.setItem('bms_token', 'mock-patient-token');
    localStorage.setItem('bms_access_token', 'mock-patient-token');
    localStorage.setItem('accessToken', 'mock-patient-token');
    localStorage.setItem('token', 'mock-patient-token');
    localStorage.setItem('bms_user', JSON.stringify(u));
    localStorage.setItem('user', JSON.stringify(u));
  }, mockUser);

  // 2. Open payment history
  await page.goto('http://localhost:3000/patient/payment-history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of payment history page with 'Hóa Đơn VAT' button
  await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/patient-payment-history-table-vat.png' });

  // 3. Click 'Hóa Đơn VAT' button for INV-20261031-002 (matching user screenshot)
  const targetRow = page.locator('tr:has-text("INV-20261031-002")');
  await expect(targetRow).toBeVisible({ timeout: 5000 });
  const vatBtn = targetRow.locator('button:has-text("Hóa Đơn VAT")');
  await expect(vatBtn).toBeVisible();
  await vatBtn.click();
  await page.waitForTimeout(800);

  // 4. Verify VAT Invoice Modal is displayed with all legal elements
  const vatSheet = page.locator('#official-vat-invoice-sheet');
  await expect(vatSheet).toBeVisible();

  // Verify Header: Seller, Form, Serial, Invoice No, CQT Code
  await expect(page.locator('.bms-vat-title')).toBeVisible();
  await expect(page.locator('.bms-vat-seller-name')).toHaveText('CÔNG TY CỔ PHẦN PHÒNG KHÁM CHUYÊN KHOA XÉT NGHIỆM BMS');
  await expect(page.locator('.bms-vat-taxcode')).toHaveText('0317896868');
  await expect(page.locator('.bms-vat-id-val.text-primary')).toHaveText('1C26TBM');
  await expect(page.locator('.bms-vat-grand-total')).toBeVisible();
  await expect(page.locator('.bms-vat-in-words')).toContainText('Một trăm tám mươi nghìn đồng chẵn.');
  await expect(page.locator('.seller-stamp')).toContainText('Signature Valid');
  await expect(page.locator('.seller-stamp')).toContainText('0317896868');
  await expect(page.locator('.buyer-stamp')).toContainText('ĐÃ XÁC THỰC ĐIỆN TỬ');

  // 5. Take screenshot of the entire A4 VAT invoice sheet element
  const vatSheetElement = page.locator('#official-vat-invoice-sheet');
  await vatSheetElement.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/official-electronic-vat-invoice-full.png'
  });

  // Also capture modal view
  await page.screenshot({
    path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/official-electronic-vat-invoice.png',
    fullPage: false
  });

  console.log('Successfully captured official VAT invoice screenshot!');
});

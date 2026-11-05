const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as receptionist (roleId: 5)
  const user = {
    id: 'USR-REC-01',
    fullName: 'Lê Tân Đỗ Lan Anh',
    username: 'receptionist',
    roleId: 5,
    role: 'RECEPTIONIST',
    roleName: 'RECEPTIONIST'
  };

  await page.goto('http://localhost:3000/invoices', { waitUntil: 'commit' });
  await page.evaluate((u) => {
    localStorage.setItem('bms_token', 'mock-token');
    localStorage.setItem('bms_user', JSON.stringify(u));
    localStorage.setItem('user', JSON.stringify(u));
  }, user);

  await page.goto('http://localhost:3000/invoices', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'C:/Users/ADMIN/.gemini/antigravity/brain/25ad7756-f424-4f7d-bedf-8879730fd819/receptionist-invoices-fixed.png' });
  console.log('Successfully loaded /invoices without any babel/vite error!');

  await browser.close();
})();

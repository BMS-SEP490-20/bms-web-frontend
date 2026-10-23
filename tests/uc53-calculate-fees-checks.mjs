/**
 * @file uc53-calculate-fees-checks.mjs
 * @description Automated verification checks for UC53 (Calculate Fees Web API).
 */

import { calculateFee, validateVoucherCode } from "../src/features/billing/api/feeCalculationApi.js";

console.log("=================================================");
console.log("🧪 UC53 Automated Verification Suite (Web)");
console.log("=================================================");

let passed = 0;
let total = 0;

function assertEqual(checkName, actual, expected) {
    total++;
    if (actual === expected) {
        console.log(`  [PASS] ${checkName} (Expected: ${expected}, Got: ${actual})`);
        passed++;
    } else {
        console.error(`  [FAIL] ${checkName} (Expected: ${expected}, Got: ${actual})`);
    }
}

function assertTrue(checkName, condition) {
    total++;
    if (condition) {
        console.log(`  [PASS] ${checkName}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${checkName} (Condition was FALSE)`);
    }
}

async function runTests() {
    // Check 1: Standard Clinic Base Fee
    console.log("\n--- Check 1: Standard Clinic Base Fee ---");
    const res1 = await calculateFee({
        packageIds: ["PKG-CBC-01", "PKG-BIO-01"],
        serviceType: "Clinic"
    });
    assertEqual("Test Subtotal is 400,000", res1.testSubTotal, 400000);
    assertEqual("Home surcharge is 0 for Clinic", res1.homeCollectionSurcharge, 0);
    assertEqual("Net total payable is 400,000", res1.netTotalPayable, 400000);

    // Check 2: Home Collection Surcharge (+150,000)
    console.log("\n--- Check 2: Home Collection Surcharge ---");
    const res2 = await calculateFee({
        packageIds: ["PKG-CBC-01"],
        serviceType: "HomeCollection"
    });
    assertEqual("Subtotal is 150,000", res2.testSubTotal, 150000);
    assertEqual("Home Collection Surcharge is 150,000", res2.homeCollectionSurcharge, 150000);
    assertEqual("Gross Total is 300,000", res2.grossTotal, 300000);
    assertEqual("Net total payable is 300,000", res2.netTotalPayable, 300000);

    // Check 3: BHYT Standard (80% coverage)
    console.log("\n--- Check 3: BHYT Standard (80%) ---");
    const res3 = await calculateFee({
        packageIds: ["PKG-CBC-01"], // 150,000
        serviceType: "Clinic",
        insuranceCardNumber: "DN4791234567890" // 80% = 120,000 deduction
    });
    assertTrue("Insurance verified", res3.hasInsurance);
    assertEqual("Insurance coverage percent is 80%", res3.insuranceCoveragePercent, 80);
    assertEqual("Insurance deduction is 120,000", res3.insuranceDeduction, 120000);
    assertEqual("Net total payable is 30,000", res3.netTotalPayable, 30000);

    // Check 4: BHYT Children < 6 (TE - 100% coverage)
    console.log("\n--- Check 4: BHYT Children < 6 (TE - 100%) ---");
    const res4 = await calculateFee({
        packageIds: ["PKG-CBC-01", "PKG-BIO-01"], // 400,000
        serviceType: "Clinic",
        insuranceCardNumber: "TE1012345678901" // 100% = 400,000 deduction
    });
    assertEqual("Insurance coverage percent is 100%", res4.insuranceCoveragePercent, 100);
    assertEqual("Insurance deduction is 400,000", res4.insuranceDeduction, 400000);
    assertEqual("Net total payable is 0", res4.netTotalPayable, 0);

    // Check 5: Voucher Validation BMS10 and FREEHOME
    console.log("\n--- Check 5: Voucher Validation ---");
    const vRes1 = await validateVoucherCode("BMS10", 1200000, "Clinic");
    assertTrue("BMS10 is valid", vRes1.isValid);
    assertEqual("BMS10 discount is 120,000", vRes1.discountAmount, 120000);

    const vRes2 = await validateVoucherCode("FREEHOME", 150000, "HomeCollection");
    assertTrue("FREEHOME is valid", vRes2.isValid);
    assertEqual("FREEHOME discount is 150,000", vRes2.discountAmount, 150000);

    console.log("\n=================================================");
    console.log(`RESULTS: ${passed}/${total} checks PASSED!`);
    console.log("=================================================");

    if (passed !== total) {
        process.exit(1);
    }
}

runTests();

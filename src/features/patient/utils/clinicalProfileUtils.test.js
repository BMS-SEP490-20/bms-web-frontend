import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNoCoagulation,
  isCanonicalNkda,
  isEntireListNkda,
  splitAllergyTokens,
  splitFreeTextNotes,
  isAllergyMatch,
  CANONICAL_NO_COAGULATION,
  CANONICAL_NKDA,
  NO_COAGULATION_STRINGS,
  NO_ALLERGY_STRINGS
} from './clinicalProfileUtils.js';

describe('ClinicalProfileUtils Unit Tests', () => {

  describe('splitAllergyTokens() - Delimiter & Parentheses Preservation', () => {
    it('preserves "Hải sản (Tôm, Cua)" intact when commas are inside parentheses', () => {
      const input = 'Hải sản (Tôm, Cua)';
      const result = splitAllergyTokens(input);
      assert.deepStrictEqual(result, ['Hải sản (Tôm, Cua)']);
    });

    it('splits comma-delimited list without breaking parenthesized items', () => {
      const input = 'Hải sản (Tôm, Cua), Penicillin / Amox, Dị ứng trứng / sữa / đậu phộng';
      const result = splitAllergyTokens(input);
      assert.deepStrictEqual(result, [
        'Hải sản (Tôm, Cua)',
        'Penicillin / Amox',
        'Dị ứng trứng / sữa / đậu phộng'
      ]);
    });

    it('splits semicolon-delimited list cleanly', () => {
      const input = 'Hải sản (Tôm, Cua); Penicillin / Amox; Aspirin / Paracetamol';
      const result = splitAllergyTokens(input);
      assert.deepStrictEqual(result, [
        'Hải sản (Tôm, Cua)',
        'Penicillin / Amox',
        'Aspirin / Paracetamol'
      ]);
    });

    it('handles mixed delimiters (semicolon, newline, comma outside parens)', () => {
      const input = 'Hải sản (Tôm, Cua);\nPenicillin / Amox,\nKháng viêm NSAIDs (Ibuprofen, Meloxicam)';
      const result = splitAllergyTokens(input);
      assert.deepStrictEqual(result, [
        'Hải sản (Tôm, Cua)',
        'Penicillin / Amox',
        'Kháng viêm NSAIDs (Ibuprofen, Meloxicam)'
      ]);
    });

    it('supports array inputs by flattening and tokenizing elements', () => {
      const input = ['Hải sản (Tôm, Cua)', 'Penicillin; Aspirin'];
      const result = splitAllergyTokens(input);
      assert.deepStrictEqual(result, [
        'Hải sản (Tôm, Cua)',
        'Penicillin',
        'Aspirin'
      ]);
    });

    it('handles null, undefined, empty strings and trims whitespace', () => {
      assert.deepStrictEqual(splitAllergyTokens(''), []);
      assert.deepStrictEqual(splitAllergyTokens(null), []);
      assert.deepStrictEqual(splitAllergyTokens(undefined), []);
      assert.deepStrictEqual(splitAllergyTokens('   ; ; , \n  '), []);
    });

    it('guarantees round-trip serialization and deserialization with semicolon delimiter', () => {
      const original = ['Hải sản (Tôm, Cua)', 'Penicillin / Amox', 'Kháng viêm NSAIDs'];
      const serialized = original.join('; ');
      const parsed = splitAllergyTokens(serialized);
      assert.deepStrictEqual(parsed, original);
    });
  });

  describe('splitFreeTextNotes() - Free-Text Note Preservation (Comma Safe)', () => {
    it('preserves sentence with commas as a single note without splitting by comma', () => {
      const input = 'Dị ứng phấn hoa, xuất hiện mùa xuân';
      const result = splitFreeTextNotes(input);
      assert.deepStrictEqual(result, ['Dị ứng phấn hoa, xuất hiện mùa xuân']);
    });

    it('splits multiple free-text notes separated by semicolon or newline', () => {
      const input = 'Dị ứng phấn hoa, xuất hiện mùa xuân; Dị ứng lông mèo\nDị ứng bột giặt Omo, ngứa da';
      const result = splitFreeTextNotes(input);
      assert.deepStrictEqual(result, [
        'Dị ứng phấn hoa, xuất hiện mùa xuân',
        'Dị ứng lông mèo',
        'Dị ứng bột giặt Omo, ngứa da'
      ]);
    });
  });

  describe('isCanonicalNkda() - No Known Drug Allergies Matching', () => {
    it('identifies standard canonical NKDA strings', () => {
      assert.strictEqual(isCanonicalNkda(CANONICAL_NKDA), true);
      assert.strictEqual(isCanonicalNkda('NKDA'), true);
      assert.strictEqual(isCanonicalNkda('nkda'), true);
      assert.strictEqual(isCanonicalNkda('không có'), true);
      assert.strictEqual(isCanonicalNkda('không có dị ứng'), true);
      assert.strictEqual(isCanonicalNkda('không có ghi nhận dị ứng'), true);
      assert.strictEqual(isCanonicalNkda('chưa ghi nhận dị ứng'), true);
    });

    it('identifies legacy string "không ghi nhận dị ứng" used in UserProfilePage', () => {
      assert.strictEqual(isCanonicalNkda('không ghi nhận dị ứng'), true);
      assert.strictEqual(isCanonicalNkda('Không ghi nhận dị ứng'), true);
      assert.strictEqual(isCanonicalNkda('  Không ghi nhận dị ứng   '), true);
    });

    it('rejects complex clinical sentences that mention "Không có" but report real allergies', () => {
      const complexSentence = 'Không có phản ứng với Aspirin nhưng dị ứng Penicillin';
      assert.strictEqual(isCanonicalNkda(complexSentence), false);
    });

    it('rejects incomplete or descriptive notes', () => {
      assert.strictEqual(isCanonicalNkda('Không rõ mức độ dị ứng'), false);
      assert.strictEqual(isCanonicalNkda('Không có biểu hiện sốc phản vệ'), false);
      assert.strictEqual(isCanonicalNkda(''), false);
      assert.strictEqual(isCanonicalNkda(null), false);
    });
  });

  describe('isEntireListNkda() - Allergy List Evaluation', () => {
    it('returns true for pure canonical NKDA lists', () => {
      assert.strictEqual(isEntireListNkda([CANONICAL_NKDA]), true);
      assert.strictEqual(isEntireListNkda(['NKDA']), true);
      assert.strictEqual(isEntireListNkda(['không có', 'nkda']), true);
      assert.strictEqual(isEntireListNkda(['Không ghi nhận dị ứng']), true);
    });

    it('returns true for empty or null lists', () => {
      assert.strictEqual(isEntireListNkda([]), true);
      assert.strictEqual(isEntireListNkda(null), true);
      assert.strictEqual(isEntireListNkda(undefined), true);
      assert.strictEqual(isEntireListNkda(['   ']), true);
    });

    it('returns false when any actual allergy exists (even if mixed with NKDA)', () => {
      assert.strictEqual(isEntireListNkda(['NKDA', 'Hải sản (Tôm, Cua)']), false);
      assert.strictEqual(isEntireListNkda(['Không ghi nhận dị ứng', 'Penicillin / Amox']), false);
    });

    it('returns false for complex descriptive sentence to prevent data loss', () => {
      assert.strictEqual(isEntireListNkda(['Không có phản ứng với Aspirin nhưng dị ứng Penicillin']), false);
    });
  });

  describe('isAllergyMatch() - Alias & Short Token Boundary Safety', () => {
    it('matches target allergy with exact label', () => {
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'Hải sản (Tôm, Cua)'), true);
      assert.strictEqual(isAllergyMatch('Penicillin / Amox', 'Penicillin / Amox'), true);
    });

    it('matches target allergy via known canonical aliases', () => {
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'tôm'), true);
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'cua'), true);
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'dị ứng hải sản'), true);
      assert.strictEqual(isAllergyMatch('Penicillin / Amox', 'Amoxicillin'), true);
      assert.strictEqual(isAllergyMatch('Aspirin / Paracetamol', 'Paracetamol'), true);
      assert.strictEqual(isAllergyMatch('Cồn / Povidine', 'Cồn sát trùng'), true);
    });

    it('supports backward compatibility for legacy "Trứng / Sữa / Đậu"', () => {
      assert.strictEqual(isAllergyMatch('Trứng / Sữa / Đậu phộng', 'Trứng / Sữa / Đậu'), true);
      assert.strictEqual(isAllergyMatch('Trứng / Sữa / Đậu phộng', 'dị ứng trứng, sữa, đậu'), true);
      assert.strictEqual(isAllergyMatch('Trứng / Sữa / Đậu phộng', 'đậu phộng'), true);
    });

    it('prevents false-positive short token bleed on unrelated Vietnamese text', () => {
      // "chua" should not match "cua"
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'Thức ăn chua, không rõ mức độ'), false);
      // "mức độ" should not match "mực"
      assert.strictEqual(isAllergyMatch('Hải sản (Tôm, Cua)', 'Không rõ mức độ dị ứng'), false);
      // "Viêm họng" should not match "Kháng viêm NSAIDs"
      assert.strictEqual(isAllergyMatch('Kháng viêm NSAIDs', 'Viêm họng cấp, dùng kháng sinh'), false);
    });
  });

  describe('isNoCoagulation() - Coagulation Disorder Evaluation', () => {
    it('identifies canonical negative coagulation strings', () => {
      assert.strictEqual(isNoCoagulation(CANONICAL_NO_COAGULATION), true);
      assert.strictEqual(isNoCoagulation('không có'), true);
      assert.strictEqual(isNoCoagulation('không có tiền sử đông máu'), true);
      assert.strictEqual(isNoCoagulation('không có ghi nhận'), true);
      assert.strictEqual(isNoCoagulation(''), true);
      assert.strictEqual(isNoCoagulation(null), true);
    });

    it('preserves clinical pathology notes containing the word "Không"', () => {
      assert.strictEqual(isNoCoagulation('Hemophilia. Không dùng Warfarin'), false);
      assert.strictEqual(isNoCoagulation('Rối loạn đông máu nhẹ. Không rõ thời gian'), false);
      assert.strictEqual(isNoCoagulation('Xuất huyết giảm tiểu cầu. Không rõ nguyên nhân'), false);
    });
  });
});

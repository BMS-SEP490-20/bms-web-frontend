/**
 * @file clinicalProfileUtils.js
 * @description Standardized clinical helpers for patient intake and profile management.
 * Consolidates negative coagulation checks, canonical NKDA matching, and backward-compatible allergy matching.
 * Conforms to: ISO 15189:2022 & Medical Telehealth UI Specification.
 */

// 1. Negative Coagulation Strings (Exact Clinical Matching)
export const NO_COAGULATION_STRINGS = Object.freeze([
  'không có',
  'không có tiền sử đông máu',
  'không có tiền sử rối loạn đông máu',
  'không có ghi nhận'
]);

export const CANONICAL_NO_COAGULATION = 'Không có tiền sử rối loạn đông máu';

/**
 * Checks if a string represents an exact negative coagulation history.
 * Avoids false negatives on clinical notes containing "Không" (e.g. "Hemophilia. Không dùng Warfarin").
 */
export function isNoCoagulation(val) {
  if (!val) return true;
  const normalized = val.trim().toLowerCase();
  return NO_COAGULATION_STRINGS.includes(normalized);
}

// 2. Canonical NKDA Strings (No Known Drug Allergies)
export const NO_ALLERGY_STRINGS = Object.freeze([
  'không có',
  'không có dị ứng',
  'không ghi nhận dị ứng',
  'không có ghi nhận dị ứng',
  'không có tiền sử dị ứng đã biết (nkda)',
  'không có tiền sử dị ứng đã biết',
  'nkda',
  'không dị ứng',
  'chưa ghi nhận dị ứng',
  'chưa ghi nhận',
  'không ghi nhận'
]);

export const CANONICAL_NKDA = 'Không có tiền sử dị ứng đã biết (NKDA)';

/**
 * Checks whether an allergy item is an exact canonical NKDA declaration.
 * Avoids false positives from clinical phrases containing "không có" (e.g. "Không có phản ứng với Aspirin nhưng dị ứng Penicillin").
 */
export function isCanonicalNkda(val) {
  if (!val) return false;
  const normalized = val.trim().toLowerCase();
  return NO_ALLERGY_STRINGS.includes(normalized);
}

/**
 * Checks if an entire allergy array represents purely NKDA / negative history.
 */
export function isEntireListNkda(allergies) {
  if (!allergies || !Array.isArray(allergies) || allergies.length === 0) return true;
  const nonEmpties = allergies.map(a => a.trim()).filter(Boolean);
  if (nonEmpties.length === 0) return true;
  return nonEmpties.every(a => isCanonicalNkda(a));
}

// 3. Allergy Mapping with Token Boundary & Backward Compatibility
const ALLERGY_CANONICAL_ALIASES = Object.freeze({
  'Penicillin / Amox': [
    'penicillin / amox',
    'penicillin',
    'amox',
    'amoxicillin',
    'ampicillin',
    'kháng sinh penicillin / amoxicillin',
    'kháng sinh penicillin'
  ],
  'Cephalosporin': [
    'cephalosporin',
    'cefalosporin',
    'kháng sinh cephalosporin',
    'cefixime',
    'ceftriaxone',
    'cefuroxime'
  ],
  'Aspirin / Paracetamol': [
    'aspirin / paracetamol',
    'aspirin',
    'paracetamol',
    'acetaminophen',
    'thuốc giảm đau aspirin / paracetamol',
    'thuốc giảm đau aspirin'
  ],
  'Kháng viêm NSAIDs': [
    'kháng viêm nsaids',
    'nsaids',
    'nsaid',
    'ibuprofen',
    'meloxicam',
    'celecoxib',
    'diclofenac',
    'thuốc chống viêm nsaids',
    'thuốc chống viêm nsaids (ibuprofen...)'
  ],
  'Hải sản (Tôm, Cua)': [
    'hải sản (tôm, cua)',
    'dị ứng hải sản (tôm, cua, mực)',
    'dị ứng hải sản',
    'hải sản',
    'tôm, cua',
    'tôm',
    'cua',
    'mực'
  ],
  'Trứng / Sữa / Đậu phộng': [
    'trứng / sữa / đậu phộng',
    'dị ứng trứng / sữa / đậu phộng',
    'trứng / sữa / đậu',
    'dị ứng trứng / sữa / đậu',
    'trứng, sữa, đậu',
    'đậu phộng',
    'dị ứng trứng',
    'dị ứng sữa',
    'dị ứng đậu phộng'
  ],
  'Phấn hoa / Bụi nhà': [
    'phấn hoa / bụi nhà',
    'phấn hoa / bụi nhà / thời tiết',
    'phấn hoa',
    'bụi nhà',
    'thời tiết'
  ],
  'Cồn / Povidine': [
    'cồn / povidine',
    'cồn sát trùng / povidine / băng keo y tế',
    'cồn sát trùng',
    'cồn y tế',
    'povidine',
    'povidone',
    'băng keo y tế'
  ]
});

/**
 * Splits text into individual trimmed tokens.
 * Handles delimiters (;, \n, and comma) while respecting nested parentheses
 * (e.g. "Hải sản (Tôm, Cua)" is preserved intact as a single token).
 */
export function splitAllergyTokens(text) {
  if (!text) return [];
  if (Array.isArray(text)) {
    return text.flatMap(item => splitAllergyTokens(item)).map(s => s.trim()).filter(Boolean);
  }
  const str = String(text).trim();
  if (!str) return [];

  const tokens = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(' || char === '[' || char === '{') {
      parenDepth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      if (parenDepth > 0) parenDepth--;
      current += char;
    } else if (parenDepth === 0 && (char === ';' || char === '\n' || char === ',')) {
      const trimmed = current.trim();
      if (trimmed) tokens.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const last = current.trim();
  if (last) tokens.push(last);
  return tokens;
}

/**
 * Checks if a candidate allergy token matches a target common allergy preset.
 * Matches full phrases or defined canonical aliases, preventing substring bleed on short tokens.
 */
export function isAllergyMatch(targetAllergy, candidateItemOrText) {
  if (!targetAllergy || !candidateItemOrText) return false;

  const aliases = ALLERGY_CANONICAL_ALIASES[targetAllergy] || [targetAllergy.toLowerCase().trim()];
  const tokens = splitAllergyTokens(candidateItemOrText).map(t => t.toLowerCase());

  // Check if any of the candidate tokens matches any known alias for the target
  return tokens.some(tok => {
    return aliases.some(alias => {
      // 1. Exact match
      if (tok === alias) return true;
      // 2. Phrase contains alias as a distinct phrase (boundary-checked)
      if (tok.includes(alias)) {
        if (alias.length >= 4) return true;
        const re = new RegExp(`(^|[^a-z0-9à-ỹ])${alias}([^a-z0-9à-ỹ]|$)`, 'i');
        return re.test(tok);
      }
      return false;
    });
  });
}


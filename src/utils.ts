/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from './types';

export const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

export function toKhmerNumerals(num: string | number | undefined | null): string {
  if (num === undefined || num === null) return '០';
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num.toString().split('').map(digit => {
    const parsed = parseInt(digit, 10);
    return isNaN(parsed) ? digit : khmerDigits[parsed];
  }).join('');
}

export function formatKhmerTwoDigits(num: number): string {
  const str = num < 10 ? '0' + num : num.toString();
  return toKhmerNumerals(str);
}

export function formatKhmerDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2].padStart(2, '0');
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day}-${khmerMonths[monthIdx]}-${year}`;
  }
  return dateStr;
}

export function getKhmerFullName(s: { lastName?: string; firstName?: string; khmerName?: string } | undefined): string {
  if (!s) return '';
  if (s.lastName && s.firstName) {
    return `${s.lastName} ${s.firstName}`;
  }
  return s.khmerName || '';
}

export function getCombinedGrade(s: { grade?: string; classType?: string } | undefined): string {
  if (!s || !s.grade) return '';
  if ((s.grade === '11' || s.grade === '12') && s.classType && s.classType !== 'ទូទៅ') {
    return `${s.grade} (${s.classType})`;
  }
  return s.grade;
}

export function getRoomName(index: number): string {
  let name = '';
  while (index >= 0) {
    name = String.fromCharCode((index % 26) + 65) + name;
    index = Math.floor(index / 26) - 1;
  }
  return name;
}

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const result: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols: string[] = [];
    let insideQuotes = false;
    let currentColumn = '';
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cols.push(currentColumn.replace(/^"|"$/g, '').trim());
        currentColumn = '';
      } else {
        currentColumn += char;
      }
    }
    cols.push(currentColumn.replace(/^"|"$/g, '').trim());
    result.push(cols);
  }
  return result;
}

/**
 * Obfuscate sensitive strings so that they are stored as Hex-encoded, XOR-ed strings in localStorage
 * preventing simple Inspect element/Developer mode sniffing of passwords and usernames.
 */
export function obfuscateText(text: string): string {
  if (!text) return '';
  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const scrambled = (code ^ 42) + i;
    const hex = scrambled.toString(16).padStart(4, '0');
    result.push(hex);
  }
  return result.join('');
}

/**
 * Deobfuscate Hex-encoded strings back to standard string representation.
 */
export function deobfuscateText(obfuscated: string): string {
  if (!obfuscated || obfuscated.length % 4 !== 0) return obfuscated;
  try {
    const result: string[] = [];
    for (let i = 0; i < obfuscated.length; i += 4) {
      const hexStr = obfuscated.substring(i, i + 4);
      const scrambled = parseInt(hexStr, 16);
      const idx = i / 4;
      const originalCode = (scrambled - idx) ^ 42;
      result.push(String.fromCharCode(originalCode));
    }
    return result.join('');
  } catch (e) {
    return obfuscated;
  }
}

/**
 * Convert Khmer numerals to regular Arabic numerals (e.g. '១២' -> '12')
 */
export function convertKhmerToArabicNumerals(numStr: string | undefined | null): string {
  if (!numStr) return '';
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  let result = '';
  for (let i = 0; i < numStr.length; i++) {
    const char = numStr[i];
    const idx = khmerDigits.indexOf(char);
    if (idx !== -1) {
      result += idx.toString();
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Normalizes user-supplied date strings (with slash, dot, Khmer numerals, or Khmer months)
 * into a standardized 'YYYY-MM-DD' string compatible with standard calendar inputs.
 */
export function normalizeDateToISO(dateStr: string | undefined | null): string {
  if (!dateStr) return '2010-01-01';
  
  // 1. Convert Khmer numbers to regular numbers first (e.g. ២០១០ -> 2010, ១២ -> 12)
  let clean = convertKhmerToArabicNumerals(dateStr).trim();
  if (!clean) return '2010-01-01';

  // 2. Normalize typical delimiters like / or . to -
  clean = clean.replace(/[\/\.]/g, '-');

  // If it's already exactly YYYY-MM-DD, return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Split date components
  const parts = clean.split('-').map(p => p.trim());
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    // Check if it's in YYYY-MM-DD format but with dots/slashes
    if (day.length === 4) {
      // It is Year-Month-Day! Swap values to align with Day-Month-Year convention below
      const temp = day;
      day = year;
      year = temp;
    }

    // Now day and year should be properly positioned
    // 3. Process the month component (could be text like "មករា" or number like "05" / "5")
    const khmerMonthIdx = khmerMonths.findIndex(m => m === month || month.includes(m));
    if (khmerMonthIdx !== -1) {
      month = (khmerMonthIdx + 1).toString().padStart(2, '0');
    } else {
      // Clean non-digit characters if any
      month = month.replace(/\D/g, '').padStart(2, '0');
    }

    // Clean non-digits from day and year
    day = day.replace(/\D/g, '').padStart(2, '0');
    year = year.replace(/\D/g, '');

    // Normalize two-digit year shortcuts (e.g., 10 -> 2010, 95 -> 1995)
    if (year.length === 2) {
      const yrNum = parseInt(year, 10);
      year = yrNum > 35 ? `19${year}` : `20${year}`;
    }

    // Ensure valid numerical outputs with defensive fallbacks
    const finalYear = parseInt(year, 10) || 2010;
    const finalMonth = Math.min(Math.max(parseInt(month, 10) || 1, 1), 12).toString().padStart(2, '0');
    const finalDay = Math.min(Math.max(parseInt(day, 10) || 1, 1), 31).toString().padStart(2, '0');

    return `${finalYear}-${finalMonth}-${finalDay}`;
  }

  // Fallback to Native Date parser for standard text formats
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const yStr = d.getFullYear().toString();
      const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const dStr = d.getDate().toString().padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }
  } catch (e) {
    // ignore
  }

  return '2010-01-01';
}

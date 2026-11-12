import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { parseInitialPhone } from "./phone";

export interface DuplicateMatch {
  id: string;
  clientCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  clientStatus: string;
  assignedSalespersonName?: string;
  contractValue: number;
  matchReasons: ("email" | "phone" | "companyName")[];
}

export interface DuplicateCheckResult {
  hasMatches: boolean;
  hasExactEmailMatch: boolean; // Email matches an active or archived client
  activeEmailMatch: boolean;   // Email matches an active client (Strict blocker)
  matches: DuplicateMatch[];
}

/**
 * Normalizes company names for fuzzy duplicate detection:
 * - Lowercase
 * - Removes common business designations: "pvt ltd", "ltd", "private limited", "llp", "inc", "corp", "co", "technologies", "services"
 * - Removes non-alphanumeric characters and collapse spaces
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  
  // Remove common Indian & global legal company suffixes
  const suffixes = [
    /\bprivate limited\b/g,
    /\bpvt\.?\s*ltd\.?\b/g,
    /\blimited\b/g,
    /\bltd\.?\b/g,
    /\bllp\b/g,
    /\binc\.?\b/g,
    /\bcorp\.?\b/g,
    /\bcorporation\b/g,
    /\bco\.?\b/g,
    /\benterprises\b/g,
    /\bsolutions\b/g,
    /\bservices\b/g,
    /\btechnologies\b/g,
  ];

  for (const suf of suffixes) {
    n = n.replace(suf, "");
  }

  // Replace special characters and extra spaces
  return n.replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Normalizes email: trim and lowercase
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone numbers to standard 10-digit national number or E.164 digits
 */
export function normalizePhone(rawPhone: string, defaultCountry: CountryCode = "IN"): string {
  if (!rawPhone) return "";
  const parsed = parseInitialPhone(rawPhone, defaultCountry);
  const digits = parsed.nationalNumber.replace(/\D/g, "");
  // Return last 10 digits for Indian numbers to compare regardless of 0, +91, or 91 prefix
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}


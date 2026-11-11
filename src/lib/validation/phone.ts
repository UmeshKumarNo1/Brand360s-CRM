import { parsePhoneNumberFromString, CountryCode, getCountryCallingCode } from "libphonenumber-js";

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

export const POPULAR_COUNTRIES: CountryOption[] = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
];

/**
 * Parses any incoming phone string into country code and local number
 */
export function parseInitialPhone(
  rawPhone?: string | null,
  defaultCountry: CountryCode = "IN"
): { country: CountryCode; nationalNumber: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { country: defaultCountry, nationalNumber: "" };
  }

  const trimmed = rawPhone.trim();
  // Try parsing with libphonenumber-js
  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (parsed && parsed.country) {
      return {
        country: parsed.country,
        nationalNumber: parsed.nationalNumber,
      };
    }
  } catch (e) {
    // ignore
  }

  // Fallback: check dial codes from POPULAR_COUNTRIES
  for (const c of POPULAR_COUNTRIES) {
    if (trimmed.startsWith(c.dialCode)) {
      const remaining = trimmed.slice(c.dialCode.length).replace(/\D/g, "");
      return { country: c.code, nationalNumber: remaining };
    }
  }

  // If numbers only, remove non-digits
  const digitsOnly = trimmed.replace(/\D/g, "");
  return { country: defaultCountry, nationalNumber: digitsOnly };
}

/**
 * Validates a phone number based on country code and number string
 */
export function validatePhoneNumber(
  nationalNumber: string,
  country: CountryCode,
  isRequired: boolean = true
): { isValid: boolean; error: string | null; formatted: string } {
  const digits = (nationalNumber || "").replace(/\D/g, "");

  if (!digits) {
    if (isRequired) {
      return { isValid: false, error: "Phone number is required.", formatted: "" };
    }
    return { isValid: true, error: null, formatted: "" };
  }

  // Special strict rule for India: Exactly 10 digits mobile number
  if (country === "IN") {
    if (digits.length !== 10) {
      return {
        isValid: false,
        error: `Indian mobile number must be exactly 10 digits (currently ${digits.length}).`,
        formatted: `+91 ${digits}`,
      };
    }
    // Check Indian mobile prefix: usually starts with 6, 7, 8, or 9
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
        formatted: `+91 ${digits}`,
      };
    }
    return {
      isValid: true,
      error: null,
      formatted: `+91 ${digits}`,
    };
  }

  // For other countries, parse and validate via libphonenumber-js
  try {
    const parsed = parsePhoneNumberFromString(digits, country);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        error: null,
        formatted: parsed.formatInternational(),
      };
    } else {
      let dialCode = "+";
      try {
        dialCode += getCountryCallingCode(country);
      } catch {
        dialCode = "";
      }
      return {
        isValid: false,
        error: `Invalid phone number for ${country}. Please verify the digit count and area code.`,
        formatted: `${dialCode} ${digits}`.trim(),
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: "Invalid phone number format.",
      formatted: digits,
    };
  }
}


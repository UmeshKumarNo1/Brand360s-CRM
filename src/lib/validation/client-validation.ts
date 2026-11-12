/**
 * Client Module Validation Utilities
 * Validates Indian commercial tax identifiers (GSTIN, PAN), postal codes, and contact data.
 */

// 15-character Indian GSTIN Regex: 2 digits State Code + 10 chars PAN + 1 entity num + 'Z' + 1 checksum
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// 10-character Indian Income Tax PAN Regex: 5 letters + 4 digits + 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// 6-digit Indian PIN Code Regex: First digit 1-9, followed by 5 digits
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Standard Email Regex
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateGstin(gstin: string | null | undefined): { isValid: boolean; error?: string } {
  if (!gstin || gstin.trim() === "" || gstin.trim() === "Not GST-registered") {
    return { isValid: true };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: "GSTIN must be exactly 15 characters (e.g. 29AAAAA0000A1Z5)." };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, error: "Invalid GSTIN format. Expected format: 2 digits state code + 10-character PAN + 1 entity code + 'Z' + 1 check digit." };
  }
  return { isValid: true };
}

export function validatePan(pan: string | null | undefined): { isValid: boolean; error?: string } {
  if (!pan || pan.trim() === "") {
    return { isValid: true };
  }
  const clean = pan.trim().toUpperCase();
  if (clean.length !== 10) {
    return { isValid: false, error: "PAN must be exactly 10 characters (e.g. ABCDE1234F)." };
  }
  if (!PAN_REGEX.test(clean)) {
    return { isValid: false, error: "Invalid PAN format. Must be 5 uppercase letters, 4 digits, and 1 uppercase letter (e.g. ABCDE1234F)." };
  }
  return { isValid: true };
}

export function validatePincode(pincode: string | null | undefined): { isValid: boolean; error?: string } {
  if (!pincode || pincode.trim() === "") {
    return { isValid: true }; // pincode is required only if marked required on the form
  }
  const clean = pincode.trim();
  if (!PINCODE_REGEX.test(clean)) {
    return { isValid: false, error: "PIN Code must be a 6-digit number (e.g. 560001)." };
  }
  return { isValid: true };
}

export function validateEmailFormat(email: string | null | undefined): { isValid: boolean; error?: string } {
  if (!email || email.trim() === "") {
    return { isValid: true }; // optional
  }
  const clean = email.trim();
  if (!EMAIL_REGEX.test(clean)) {
    return { isValid: false, error: "Please enter a valid email address (e.g. client@company.com)." };
  }
  return { isValid: true };
}


"use client";

import React, { useState, useEffect } from "react";
import { CountryCode, getCountryCallingCode } from "libphonenumber-js";
import { POPULAR_COUNTRIES, validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";

interface PhoneInputProps {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  disabled?: boolean;
  onChangeValidation?: (isValid: boolean, formattedValue: string) => void;
  error?: string | null;
}

export function PhoneInput({
  label,
  name,
  defaultValue = "",
  required = false,
  disabled = false,
  onChangeValidation,
  error: externalError,
}: PhoneInputProps) {
  const initial = parseInitialPhone(defaultValue);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.nationalNumber);
  const [touched, setTouched] = useState<boolean>(false);

  // Validate current value
  const validation = validatePhoneNumber(nationalNumber, country, required);

  useEffect(() => {
    if (onChangeValidation) {
      onChangeValidation(validation.isValid, validation.formatted);
    }
  }, [validation.isValid, validation.formatted]);

  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    // If India, limit to 10 digits
    if (newCountry === "IN" && nationalNumber.length > 10) {
      setNationalNumber(nationalNumber.slice(0, 10));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // Allow only digits
    if (country === "IN" && val.length > 10) {
      val = val.slice(0, 10); // Strictly cap at 10 digits for India
    }
    setNationalNumber(val);
    setTouched(true);
  };

  let dialCode = "+91";
  try {
    dialCode = "+" + getCountryCallingCode(country);
  } catch {
    // fallback
  }

  // Format to send in form submission (e.g. "+91 9876543210")
  const hiddenFormValue = nationalNumber.trim() ? `${dialCode} ${nationalNumber.trim()}` : "";

  const displayError = externalError || (touched && !validation.isValid ? validation.error : null);

  return (
    <div className="space-y-1">
      <label className="block font-medium text-slate-700 text-xs mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Hidden input submitted with formData containing full international number */}
      <input type="hidden" name={name} value={hiddenFormValue} />

      <div className="flex rounded-lg shadow-2xs border border-slate-200 focus-within:border-[#0481A2] bg-white transition-colors">
        {/* Country Selector */}
        <div className="relative flex items-center border-r border-slate-200 bg-slate-50 rounded-l-lg hover:bg-slate-100 transition-colors">
          <select
            value={country}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
            className="appearance-none bg-transparent pl-2.5 pr-6 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            {POPULAR_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.dialCode})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">▼</span>
        </div>

        {/* National Number Input */}
        <div className="relative flex-1 flex items-center">
          <span className="pl-3 text-slate-400 text-xs select-none font-mono">{dialCode}</span>
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={nationalNumber}
            onChange={handleNumberChange}
            onBlur={() => setTouched(true)}
            placeholder={country === "IN" ? "98765 43210 (10 digits)" : "Local phone number"}
            maxLength={country === "IN" ? 10 : 15}
            className={`w-full pl-2 pr-3 py-2 text-xs text-slate-800 bg-transparent focus:outline-none rounded-r-lg ${
              displayError ? "border-red-300" : ""
            }`}
          />
        </div>
      </div>

      {/* Inline Feedback / Error */}
      {displayError ? (
        <p className="text-[11px] text-red-600 font-medium mt-0.5">{displayError}</p>
      ) : nationalNumber && validation.isValid ? (
        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
          ✓ Valid: {validation.formatted}
        </p>
      ) : null}
    </div>
  );
}


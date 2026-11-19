"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { CountryCode, getCountryCallingCode } from "libphonenumber-js";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
import { ALL_COUNTRIES } from "@/lib/data/countries";
import { CountryFlag } from "@/components/common/CountryFlag";
import { ChevronDown, Search } from "lucide-react";

export interface PhoneInputProps {
  label?: string;
  name: string;
  value?: string;
  defaultValue?: string | null;
  onChange?: (fullFormattedValue: string) => void;
  defaultCountry?: CountryCode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChangeValidation?: (isValid: boolean, formattedValue: string) => void;
  error?: string | null;
  className?: string;
}

export function PhoneInput({
  label,
  name,
  value,
  defaultValue = "",
  onChange,
  defaultCountry = "IN",
  required = false,
  disabled = false,
  placeholder,
  onChangeValidation,
  error: externalError,
  className = "",
}: PhoneInputProps) {
  // Determine initial state
  const isControlled = value !== undefined;
  const initialRaw = isControlled ? value : defaultValue;
  const initial = parseInitialPhone(initialRaw, defaultCountry);

  const [country, setCountry] = useState<CountryCode>(initial.country || defaultCountry);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.nationalNumber || "");
  const [touched, setTouched] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync when controlled value or defaultCountry changes
  useEffect(() => {
    if (isControlled && value !== undefined) {
      const parsed = parseInitialPhone(value, defaultCountry);
      if (parsed.country) setCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
    }
  }, [value, isControlled, defaultCountry]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  let dialCode = "+91";
  try {
    dialCode = "+" + getCountryCallingCode(country);
  } catch {
    dialCode = "+91";
  }

  // Validate current value
  const validation = validatePhoneNumber(nationalNumber, country, required);

  useEffect(() => {
    if (onChangeValidation) {
      onChangeValidation(validation.isValid, validation.formatted);
    }
  }, [validation.isValid, validation.formatted, onChangeValidation]);

  const handleSelectCountry = (newCountry: CountryCode) => {
    setCountry(newCountry);
    setIsOpen(false);
    setSearch("");

    let newDial = "+91";
    try {
      newDial = "+" + getCountryCallingCode(newCountry);
    } catch {
      newDial = "+91";
    }

    let updatedNumber = nationalNumber;
    if (newCountry === "IN" && updatedNumber.replace(/\D/g, "").length > 10) {
      updatedNumber = updatedNumber.replace(/\D/g, "").slice(0, 10);
      setNationalNumber(updatedNumber);
    }

    const fullValue = updatedNumber.trim() ? `${newDial} ${updatedNumber.trim()}` : "";
    if (onChange) {
      onChange(fullValue);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d\s\-]/g, ""); // Allow digits, spaces, hyphens
    const digitsOnly = val.replace(/\D/g, "");

    if (country === "IN" && digitsOnly.length > 10) {
      val = digitsOnly.slice(0, 10);
    }

    setNationalNumber(val);
    setTouched(true);

    const fullValue = val.trim() ? `${dialCode} ${val.trim()}` : "";
    if (onChange) {
      onChange(fullValue);
    }
  };

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [search]);

  // Form value for hidden input
  const hiddenFormValue = nationalNumber.trim() ? `${dialCode} ${nationalNumber.trim()}` : "";
  const displayError = externalError || (touched && !validation.isValid && nationalNumber ? validation.error : null);

  const selectedCountryItem = ALL_COUNTRIES.find((c) => c.code === country);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block font-semibold text-slate-700 text-xs">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input submitted with standard formData */}
      <input type="hidden" name={name} value={hiddenFormValue} />

      <div
        className={`relative flex items-center border rounded-xl bg-white transition-colors shadow-2xs ${
          displayError
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
            : "border-slate-300 focus-within:border-[#0481A2] focus-within:ring-1 focus-within:ring-[#0481A2]"
        }`}
      >
        {/* Country Selector Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="h-full px-3 py-2.5 flex items-center gap-1.5 border-r border-slate-200 bg-slate-50/70 hover:bg-slate-100 rounded-l-xl transition-colors cursor-pointer select-none shrink-0"
          title={`${selectedCountryItem?.name || country} (${dialCode})`}
        >
          <CountryFlag code={country} className="w-5 h-3.5 rounded-xs shadow-2xs" />
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform ${isOpen ? "rotate-180 text-[#0481A2]" : ""}`}
          />
          <span className="text-xs font-semibold text-slate-700 font-mono pl-0.5">{dialCode}</span>
        </button>

        {/* National Number Input */}
        <input
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder || (country === "IN" ? "98765 43210" : "Phone Number")}
          maxLength={country === "IN" ? 15 : 20}
          className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-transparent focus:outline-none rounded-r-xl font-number"
        />

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input matching reference image */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Country List */}
            <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No country found</div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === country;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c.code)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-[#0481A2]/10 text-[#0481A2] font-semibold"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <CountryFlag code={c.code} className="w-5 h-3.5 rounded-xs shadow-2xs" />
                      <span className="text-xs truncate flex-1 group-hover:text-slate-900">{c.name}</span>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          isSelected ? "text-[#0481A2] font-bold" : "text-slate-400"
                        }`}
                      >
                        {c.dialCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Feedback / Error */}
      {displayError ? (
        <p className="text-[11px] text-red-600 font-medium mt-0.5">{displayError}</p>
      ) : null}
    </div>
  );
}

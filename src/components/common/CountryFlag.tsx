"use client";

import React from "react";
import * as flags from "country-flag-icons/react/3x2";

interface CountryFlagProps {
  code?: string | null;
  className?: string;
  title?: string;
}

export function CountryFlag({
  code,
  className = "w-5 h-3.5 object-cover rounded-xs shrink-0 shadow-2xs inline-block",
  title,
}: CountryFlagProps) {
  if (!code) {
    return <span className="text-xs inline-block">🌐</span>;
  }

  const FlagComponent = (flags as any)[code.toUpperCase()];
  if (FlagComponent) {
    return <FlagComponent className={className} title={title || code} />;
  }

  return <span className="text-xs inline-block">🌐</span>;
}

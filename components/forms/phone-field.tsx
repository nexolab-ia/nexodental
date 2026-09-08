"use client";

import { useId, useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "@/lib/locale/phone-countries";

interface PhoneFieldProps {
  name: string;
  label: string;
  optional?: boolean;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  initialValue?: string;
  disabled?: boolean;
}

function PhoneFlag({ code }: { code: string }) {
  if (code === "cl") {
    return (
      <svg className="phone-flag" viewBox="0 0 22 16" role="img" aria-label="Bandera de Chile">
        <rect width="22" height="8" fill="#fff" />
        <rect y="8" width="22" height="8" fill="#d52b1e" />
        <rect width="8" height="8" fill="#0039a6" />
        <path d="m4 1.6.72 1.48 1.63.24-1.18 1.15.28 1.63L4 5.33 2.55 6.1l.28-1.63-1.18-1.15 1.63-.24Z" fill="#fff" />
      </svg>
    );
  }

  return <span className="phone-flag phone-flag-fallback" aria-label={`País ${code.toUpperCase()}`}>{code.toUpperCase()}</span>;
}

export function PhoneField({ name, label, optional, error, autoComplete, required, initialValue, disabled }: PhoneFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [national, setNational] = useState(() => {
    const value = initialValue?.trim() ?? "";
    return value.startsWith(DEFAULT_PHONE_COUNTRY.dial)
      ? value.slice(DEFAULT_PHONE_COUNTRY.dial.length).trim()
      : value;
  });
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const full = digits ? `${country.dial}${digits}` : "";

  return (
    <label className="phone-field" htmlFor={inputId}>
      <span>{label}{optional && <small> (opcional)</small>}</span>
      <input type="hidden" name={name} value={full} />
      <span className="phone-control">
        {PHONE_COUNTRIES.length === 1 ? (
          <span className="phone-country" aria-hidden="true">
            <PhoneFlag code={country.code} />
            {country.dial}
          </span>
        ) : (
          <span className="phone-country-picker">
            <button
              type="button"
              className="phone-country"
              aria-expanded={countryMenuOpen}
              aria-controls={`${inputId}-countries`}
              onClick={() => setCountryMenuOpen((open) => !open)}
              disabled={disabled}
            >
              <PhoneFlag code={country.code} />
              {country.dial}
            </button>
            {countryMenuOpen && (
              <span className="phone-country-menu" id={`${inputId}-countries`} role="listbox" aria-label="País del teléfono">
                {PHONE_COUNTRIES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    role="option"
                    aria-selected={option.code === country.code}
                    onClick={() => { setCountry(option); setCountryMenuOpen(false); }}
                  >
                    <PhoneFlag code={option.code} />
                    <span>{option.name}</span>
                    <span>{option.dial}</span>
                  </button>
                ))}
              </span>
            )}
          </span>
        )}
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(event) => setNational(event.target.value.replace(/[^\d ]/g, ""))}
          maxLength={14}
          placeholder="9 8765 4321"
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </span>
      {error && <span id={errorId} className="field-error" role="alert">{error}</span>}
    </label>
  );
}

import React from 'react';

const formatUzbekPhoneNumber = (val) => {
  if (!val) return '+998';
  let clean = val.replace(/[^\d+]/g, '');
  if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  if (!clean.startsWith('+998')) {
    clean = '+998' + clean.replace(/^\+?998?/, '');
  }
  const digits = clean.slice(4).replace(/\D/g, '').slice(0, 9);
  let formatted = '+998';
  if (digits.length > 0) {
    formatted += ' (' + digits.slice(0, 2);
  }
  if (digits.length > 2) {
    formatted += ') ' + digits.slice(2, 5);
  }
  if (digits.length > 5) {
    formatted += ' ' + digits.slice(5, 7);
  }
  if (digits.length > 7) {
    formatted += ' ' + digits.slice(7, 9);
  }
  return formatted;
};

export default function PhoneInput({ value, onChange, className, required, placeholder, disabled }) {
  const handleChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatUzbekPhoneNumber(rawValue);
    onChange(formatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && value === '+998') {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      className={className || "form-input"}
      value={value || '+998'}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      required={required}
      placeholder={placeholder || "+998 (90) 123 45 67"}
      disabled={disabled}
      maxLength={19}
    />
  );
}

export const isValidPhone = (val) => {
  if (!val || val === '+998') return true;
  return /^\+998 \(\d{2}\) \d{3} \d{2} \d{2}$/.test(val);
};

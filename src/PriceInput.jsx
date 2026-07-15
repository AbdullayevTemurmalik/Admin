import React from 'react';

const formatPrice = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const clean = val.toString().replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('ru-RU').format(parseInt(clean)).replace(/,/g, ' ');
};

export default function PriceInput({ value, onChange, className, required, placeholder, disabled }) {
  const handleChange = (e) => {
    const rawValue = e.target.value;
    const clean = rawValue.replace(/\D/g, ''); // Extract digits only (prevents decimals, minus, letters)
    onChange(clean);
  };

  const formattedValue = formatPrice(value);

  return (
    <input
      type="text"
      className={className || "form-input"}
      value={formattedValue}
      onChange={handleChange}
      required={required}
      placeholder={placeholder || "Masalan: 35 000"}
      disabled={disabled}
    />
  );
}

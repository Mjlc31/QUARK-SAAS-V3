import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'select' | 'phone' | 'cpfCnpj' | 'email' | 'textarea';
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  error,
  required,
  disabled,
  options = [],
  icon,
  className = '',
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, '');
    if (v.length <= 10) {
      return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const formatCpfCnpj = (val: string) => {
    const v = val.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '');
    }
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '');
  };

  const formatCurrency = (val: string | number) => {
    const numeric = typeof val === 'string' ? Number(val.replace(/\D/g, '')) / 100 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric || 0);
  };

  const parseCurrency = (val: string) => {
    return Number(val.replace(/\D/g, '')) / 100;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let rawValue = e.target.value;

    if (type === 'phone') {
      rawValue = formatPhone(rawValue);
    } else if (type === 'cpfCnpj') {
      rawValue = formatCpfCnpj(rawValue);
    } else if (type === 'currency') {
      onChange(parseCurrency(rawValue));
      return;
    } else if (type === 'number') {
      onChange(Number(rawValue));
      return;
    }

    onChange(rawValue);
  };

  const displayValue = type === 'currency' ? formatCurrency(value) : value;

  const inputClasses = `w-full bg-zinc-800/50 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${icon ? 'pl-11' : ''}`;

  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm text-zinc-400 font-medium">
        {label} {required && <span className="text-lime-400">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
            {icon}
          </div>
        )}

        {type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${inputClasses} min-h-[100px] resize-y`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        ) : type === 'select' ? (
          <select
            id={name}
            name={name}
            value={displayValue}
            onChange={handleChange}
            disabled={disabled}
            className={`${inputClasses} appearance-none`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <option value="" disabled>Selecione...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <div className="relative">
            <input
              id={name}
              name={name}
              type={type === 'email' ? 'email' : 'text'}
              value={displayValue}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              className={`${inputClasses} ${type === 'percentage' ? 'pr-8' : ''}`}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {type === 'percentage' && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                %
              </span>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {!error && helperText && <p className="text-zinc-500 text-xs mt-1">{helperText}</p>}
    </div>
  );
}

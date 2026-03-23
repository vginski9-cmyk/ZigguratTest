"use client";

interface EnumOption {
  value: string;
  label: string;
}

interface EnumSelectorProps {
  options: EnumOption[];
  value: string | string[];
  multi?: boolean;
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export function EnumSelector({
  options,
  value,
  multi = false,
  onChange,
  disabled = false,
}: EnumSelectorProps) {
  if (multi) {
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded self-center">
          MULTI
        </span>
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (isSelected) {
                  onChange(selectedValues.filter((v) => v !== opt.value));
                } else {
                  onChange([...selectedValues, opt.value]);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isSelected
                  ? "bg-blue-50 text-blue-700 border-blue-600 font-semibold border-2"
                  : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      value={typeof value === "string" ? value : value?.[0] || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
    >
      <option value="">— Select —</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

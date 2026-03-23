"use client";

interface ReviewControlsProps {
  onValidate: () => void;
  onReject?: () => void;
  validateLabel: string;
  loading?: boolean;
  disabled?: boolean;
  warningCount?: number;
}

export function ReviewControls({
  onValidate,
  validateLabel,
  loading = false,
  disabled = false,
  warningCount = 0,
}: ReviewControlsProps) {
  return (
    <div className="flex items-center justify-between border-t bg-white p-6 sticky bottom-0">
      <div>
        {warningCount > 0 && (
          <p className="text-sm text-amber-600">
            {warningCount} layer(s) need review (confidence &lt; 70)
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onValidate}
        disabled={loading || disabled}
        className="px-6 py-3 bg-[#1B2A4A] text-white rounded-lg font-medium hover:bg-[#2a3d5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {validateLabel}
      </button>
    </div>
  );
}

import React, { forwardRef } from "react";
import PropTypes from "prop-types";

/**
 * Input Component
 * * Accessible form input with automatic label/error associations
 * * Supports forwardRef for form libraries (e.g., react-hook-form)
 * * Includes ARIA attributes for screen readers
 */
const Input = forwardRef(({ label, error, className = "", id, ...props }, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[10px] font-bold uppercase tracking-wider text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full p-2.5 rounded-lg border-input surface-input text-input text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none ${className}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
};

export default Input;
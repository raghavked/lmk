'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    const togglePasswordVisibility = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowPassword(prev => !prev);
    }, []);

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label 
            htmlFor={props.id} 
            className="block text-sm font-bold text-[text-primary] ml-0.5 transition-colors duration-200"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            {...props}
            type={inputType}
            className={`flex h-12 w-full rounded-xl border border-[border-color] bg-[background-secondary] px-4 py-2 text-[text-primary] font-medium placeholder:text-[text-secondary] focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
              error ? 'border-red-500 focus:ring-red-500' : 'hover:border-coral focus:border-coral'
            } ${className} ${isPassword ? 'pr-12' : ''}`}
          />
          {isPassword && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={togglePasswordVisibility}
              onTouchStart={(e) => e.preventDefault()}
              tabIndex={-1}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 z-10 ${
showPassword 
	                  ? 'text-coral-light bg-[background-tertiary] hover:bg-[background-tertiary]' 
	                  : 'text-[text-secondary] hover:text-[text-primary] hover:bg-[background-tertiary]'
              } focus:outline-none focus:ring-2 focus:ring-coral active:scale-90`}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 transition-all duration-200 ease-out" />
              ) : (
                <Eye className="h-5 w-5 transition-all duration-200 ease-out" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs font-bold text-red-600 ml-1 animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

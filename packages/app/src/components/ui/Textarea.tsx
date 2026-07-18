import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-[10px] text-secondary font-mono block">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full bg-surface-container-lowest border border-outline-variant/60 rounded-md p-3 text-xs text-white font-mono leading-relaxed focus:outline focus:outline-2 focus:outline-primary transition-all resize-none ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[10px] text-status-critical font-mono block">
          {error}
        </span>
      )}
    </div>
  );
};

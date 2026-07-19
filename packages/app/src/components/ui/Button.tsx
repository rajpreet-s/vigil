import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'text-xs font-semibold rounded-lg px-4 py-2 transition-all shadow-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-primary border-primary text-on-primary hover:brightness-110 shadow-sm',
    secondary: 'bg-surface-container-high/40 hover:bg-surface-container-high/80 border border-outline-variant/40 text-white',
    destructive: 'text-status-critical hover:bg-error-container/20 border border-transparent',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

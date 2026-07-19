import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'critical' | 'warning' | 'healthy' | 'info' | 'low-confidence' | 'secondary';
  category?: 'severity' | 'status' | 'confidence' | 'default';
  className?: string;
  animate?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  category = 'default',
  className = '',
  animate = false,
}) => {
  const animationClass = animate ? 'animate-pulse' : '';

  // 1. Severity Badge: Solid filled pill/capsule shape
  if (category === 'severity') {
    const severityStyles = {
      critical: 'bg-[#ffb4ab] text-[#690005]',
      warning: 'bg-[#f2a93b] text-[#452b00]',
      healthy: 'bg-[#34d399] text-[#00391c]',
      info: 'bg-[#60a5fa] text-[#0f2d59]',
      'low-confidence': 'bg-[#ff9c6e] text-[#552000]',
      secondary: 'bg-surface-container-highest text-white',
    };
    return (
      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider uppercase border border-transparent shadow-sm ${severityStyles[variant]} ${className}`}>
        {children}
      </span>
    );
  }

  // 2. Status Badge: Outlined pill/capsule with a pulsing/colored dot inside
  if (category === 'status') {
    const statusStyles = {
      critical: 'border-[#ff6b6b]/30 text-[#ff6b6b] bg-[#ff6b6b]/5',
      warning: 'border-[#f2a93b]/30 text-[#f2a93b] bg-[#f2a93b]/5',
      healthy: 'border-[#34d399]/30 text-[#34d399] bg-[#34d399]/5',
      info: 'border-[#60a5fa]/30 text-[#60a5fa] bg-[#60a5fa]/5',
      'low-confidence': 'border-[#ff9c6e]/30 text-[#ff9c6e] bg-[#ff9c6e]/5',
      secondary: 'border-[#c4c6cf]/20 text-[#c4c6cf]/80 bg-[#c4c6cf]/5',
    };
    const dotColors = {
      critical: 'bg-[#ff6b6b]',
      warning: 'bg-[#f2a93b]',
      healthy: 'bg-[#34d399]',
      info: 'bg-[#60a5fa]',
      'low-confidence': 'bg-[#ff9c6e]',
      secondary: 'bg-[#c4c6cf]',
    };
    return (
      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium tracking-wide inline-flex items-center gap-1.5 ${statusStyles[variant]} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${animationClass}`} />
        {children}
      </span>
    );
  }

  // 3. Confidence Badge: Outlined technical box card
  if (category === 'confidence') {
    const borderColors = {
      critical: 'border-[#ff6b6b]/35 text-[#ff6b6b]',
      warning: 'border-[#f2a93b]/35 text-[#f2a93b]',
      healthy: 'border-[#34d399]/35 text-[#34d399]',
      info: 'border-[#60a5fa]/35 text-[#60a5fa]',
      'low-confidence': 'border-[#ff9c6e]/35 text-[#ff9c6e]',
      secondary: 'border-outline-variant/30 text-secondary',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded bg-surface-container-lowest border font-mono tracking-tight inline-flex items-center gap-1 ${borderColors[variant]} ${className}`}>
        <span>⚿</span>
        {children}
      </span>
    );
  }

  // 4. Default Badge (as original)
  const baseStyles = 'text-[10px] px-2 py-0.5 rounded font-bold font-mono tracking-wider uppercase border transition-all';
  const variantStyles = {
    critical: 'bg-status-critical/10 text-status-critical border-status-critical/20',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    healthy: 'bg-status-healthy/10 text-status-healthy border-status-healthy/20',
    info: 'bg-status-info/10 text-status-info border-status-info/20',
    'low-confidence': 'bg-status-low-confidence/10 text-status-low-confidence border-status-low-confidence/20',
    secondary: 'bg-secondary-container text-secondary border border-outline-variant/30',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${animationClass} ${className}`}>
      {children}
    </span>
  );
};

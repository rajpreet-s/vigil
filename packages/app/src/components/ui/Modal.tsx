import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-surface border border-surface-container-high/60 p-6 rounded-xl shadow-2xl max-w-md w-full relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-2 font-display uppercase tracking-wide">
          {title}
        </h3>
        <div className="text-xs text-secondary leading-relaxed mb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

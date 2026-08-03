import { useState, type ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-text-primary text-bg text-[11px] whitespace-nowrap pointer-events-none z-50">
          {label}
        </div>
      )}
    </div>
  );
}
import { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';

export const ModeWrapper = ({ children }: { children: ReactNode }) => {
  const { mode } = useApp();
  const isVent = mode === 'vent';

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isVent ? 'dark' : ''}`}
    >
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
        {children}
      </div>
    </div>
  );
};

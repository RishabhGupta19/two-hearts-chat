import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';

export const ModeWrapper = ({ children }: { children: ReactNode }) => {
  const { mode } = useApp();
  const isVent = mode === 'vent';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        className={isVent ? 'dark' : ''}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{ minHeight: '100vh' }}
      >
        <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

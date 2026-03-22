import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import { ConfettiEffect } from './ConfettiEffect';

export const ResolutionModal = ({ open, onClose }) => {
  const { resolveVent } = useApp();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleResolved = () => {
    setShowConfetti(true);
    setTimeout(async () => {
      await resolveVent();
      setShowConfetti(false);
      onClose();
    }, 2000);
  };

  return (
    <>
      {showConfetti && <ConfettiEffect />}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-lg bg-card p-8 shadow-warm text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
                Has this been resolved? 🌿
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                It's okay either way. We're just checking in.
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleResolved}
                  className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors"
                >
                   Yes, we're good
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full rounded-pill bg-muted py-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                   Not yet, keep going
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

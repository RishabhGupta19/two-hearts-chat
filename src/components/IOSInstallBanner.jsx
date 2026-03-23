import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone === true;
    const dismissed = localStorage.getItem('ios-install-dismissed');

    if (isIOS && !isInStandaloneMode && !dismissed) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('ios-install-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 fixed-bottom"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-lg mx-auto max-w-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-heading text-sm font-semibold text-foreground mb-1">
                  Install Solace
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the <Share className="inline h-3.5 w-3.5 -mt-0.5 text-primary" /> Share button below, then tap{' '}
                  <span className="font-medium text-foreground">"Add to Home Screen"</span>
                </p>
              </div>
              <button
                onClick={dismiss}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex justify-center mt-2">
              <span className="text-primary text-lg">↓</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IOSInstallBanner;

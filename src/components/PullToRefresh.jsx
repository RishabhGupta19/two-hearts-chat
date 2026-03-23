import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 80;

const PullToRefresh = ({ children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const isAtTop = () => {
    const scrollable = document.querySelector('[data-pull-scroll]');
    if (scrollable) return scrollable.scrollTop <= 0;
    return window.scrollY <= 0;
  };

  const onTouchStart = useCallback((e) => {
    if (refreshing) return;
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 120));
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      // Reload the page
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="h-full w-full relative"
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <motion.div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-[1000] bg-background/80 backdrop-blur-sm"
          style={{ height: pullDistance }}
          animate={{ opacity: pullDistance > 20 ? 1 : 0 }}
        >
          {refreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <motion.div
              animate={{ rotate: pullDistance >= THRESHOLD ? 180 : 0 }}
              className="text-muted-foreground text-xs font-body flex flex-col items-center gap-1"
            >
              <span className="text-base">↓</span>
              <span>{pullDistance >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
            </motion.div>
          )}
        </motion.div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pulling.current ? 'none' : 'transform 0.2s ease' }} className="h-full">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;

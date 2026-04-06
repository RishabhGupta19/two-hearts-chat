import { useRef, useEffect, useCallback } from 'react';

function findScrollableParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

export default function useLongPress(onLongPress, {
  delay = 500,
  threshold = 8,
  vibration = 40,
  onStart,
  onCancel,
  onEnd,
} = {}) {
  const timerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const triggeredRef = useRef(false);
  const scrollParentRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupScrollListener = useCallback(() => {
    if (scrollParentRef.current) {
      try { scrollParentRef.current.removeEventListener('scroll', onCancelListener, { passive: true }); } catch (e) {}
      scrollParentRef.current = null;
    }
  }, []);

  // keep a stable cancel listener reference
  const onCancelListener = useCallback(() => {
    clearTimer();
    triggeredRef.current = false;
    onCancel?.();
    cleanupScrollListener();
  }, [clearTimer, onCancel, cleanupScrollListener]);

  const onPointerDown = useCallback((e) => {
    // only left mouse button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    triggeredRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    onStart?.(e);

    // attach scroll listener to nearest scrollable parent so we cancel when parent scrolls
    const scrollParent = findScrollableParent(e.currentTarget);
    scrollParentRef.current = scrollParent;
    try {
      scrollParent.addEventListener('scroll', onCancelListener, { passive: true });
    } catch (err) {
      // ignore if cannot attach
    }

    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress?.(e);
      // vibration if supported
      try { if (navigator?.vibrate && vibration) navigator.vibrate(vibration); } catch (_) {}
      cleanupScrollListener();
    }, delay);
  }, [delay, onLongPress, onStart, onCancelListener, cleanupScrollListener, vibration]);

  const onPointerMove = useCallback((e) => {
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > threshold) {
      onCancelListener();
    }
  }, [threshold, onCancelListener]);

  const onPointerUp = useCallback((e) => {
    if (timerRef.current) {
      clearTimer();
    }
    if (triggeredRef.current) {
      onEnd?.(e);
    }
    triggeredRef.current = false;
    cleanupScrollListener();
  }, [clearTimer, cleanupScrollListener, onEnd]);

  const onPointerCancel = useCallback(() => {
    onCancelListener();
  }, [onCancelListener]);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupScrollListener();
    };
  }, [clearTimer, cleanupScrollListener]);

  // expose handlers to spread onto an element
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    // support desktop context menu (right click)
    onContextMenu: (e) => {
      e.preventDefault();
      onLongPress?.(e);
      try { if (navigator?.vibrate && vibration) navigator.vibrate(vibration); } catch (_) {}
    },
  };
}

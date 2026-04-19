import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps a silent <audio> loop running to prevent the browser from suspending
 * the audio context when the PWA is backgrounded.  Also creates and resumes
 * an AudioContext on every foreground return so the Web Audio pipeline stays
 * alive — this is the key trick that gives YouTube's iframe the best chance
 * of continuing playback.
 */
const useBackgroundAudio = () => {
  const silentAudioRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Create / resume a Web AudioContext ─────────────────────────────────
  const ensureAudioContext = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  // ── Create the silent audio element & start looping ────────────────────
  const unlock = useCallback(() => {
    // Silent audio element — keeps the browser audio session alive
    if (!silentAudioRef.current) {
      const audio = new Audio('/silence.mp3');
      audio.loop = true;
      audio.volume = 0.001;
      audio.preload = 'auto';
      // setAttribute to hint at OS-level media session handling
      audio.setAttribute('playsinline', '');
      audio.play().catch(() => {});
      silentAudioRef.current = audio;
    } else {
      // Already created — just make sure it's playing
      silentAudioRef.current.play().catch(() => {});
    }

    ensureAudioContext();
  }, [ensureAudioContext]);

  // ── Re-activate everything on foreground return ────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-play silent audio to re-activate the audio session
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(() => {});
        }
        // Resume the AudioContext in case iOS/Android suspended it
        ensureAudioContext();
      }
    };

    // Also listen for the page gaining focus (covers alt-tab scenarios)
    const handleFocus = () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
      }
      ensureAudioContext();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [ensureAudioContext]);

  // ── Auto-unlock on first user gesture ──────────────────────────────────
  useEffect(() => {
    const events = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
    events.forEach((e) => document.addEventListener(e, unlock, { once: true }));

    return () => {
      events.forEach((e) => document.removeEventListener(e, unlock));
    };
  }, [unlock]);

  return { unlock, silentAudioRef };
};

export default useBackgroundAudio;

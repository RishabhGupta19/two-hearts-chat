import { useEffect, useRef, useCallback } from 'react';

/**
 * useBackgroundAudio
 *
 * With native <audio> playback (JioSaavn MP3s), background audio works
 * natively. This hook provides a minimal AudioContext unlock helper
 * that the App component can call on user gestures to ensure the browser
 * allows audio playback.
 */
const useBackgroundAudio = () => {
  const audioContextRef = useRef(null);

  const unlock = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioContextRef.current = new AC();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}
  }, []);

  // Resume AudioContext when the page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { unlock };
};

export default useBackgroundAudio;

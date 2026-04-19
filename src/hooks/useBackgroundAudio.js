import { useCallback, useEffect, useRef } from 'react';

const useBackgroundAudio = () => {
  const silentAudioRef = useRef(null);

  const unlock = useCallback(() => {
    if (silentAudioRef.current) return;

    const audio = new Audio('/silence.mp3');
    audio.loop = true;
    audio.volume = 0.001;
    audio.preload = 'auto';
    audio.play().catch(() => {});
    silentAudioRef.current = audio;
  }, []);

  // Re-play the silent track when the PWA comes back to foreground.
  // iOS/Android suspend the audio context when the app is backgrounded —
  // resuming the silent track re-activates it so YT playback keeps working.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && silentAudioRef.current) {
        silentAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('touchend', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('click', unlock);
    };
  }, [unlock]);

  return { unlock, silentAudioRef };
};

export default useBackgroundAudio;

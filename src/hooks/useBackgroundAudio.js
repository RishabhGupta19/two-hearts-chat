import { useEffect, useRef, useCallback } from 'react';

/**
 * useBackgroundAudio
 *
 * Plays a looping silent audio track to keep the OS audio session alive.
 * This prevents other apps (Spotify, YT Music) from hijacking earbud
 * hardware controls, because the OS sees our PWA as the active audio
 * session holder as long as *something* is playing.
 *
 * Also provides an `unlock` callback for AudioContext resume on user
 * gestures.
 */
const useBackgroundAudio = () => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);

  const unlock = useCallback(() => {
    // AudioContext unlock
    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioContextRef.current = new AC();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch {}

    // Silent audio keep-alive — prevents other apps from stealing audio focus
    if (audioRef.current) return;

    // Tiny MP3 silence (valid frame, loops forever)
    const SILENCE =
      'data:audio/mpeg;base64,SUQzBAAAAAAAfFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

    const audio = new Audio(SILENCE);
    audio.loop = true;
    // Slightly higher volume so OS treats it as a real audio session
    // and doesn't hand control to Spotify/YT Music
    audio.volume = 0.01;

    audio.play().catch(() => {});
    audioRef.current = audio;
  }, []);

  // Resume AudioContext when the page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        // Re-start silent audio if it was somehow stopped
        if (audioRef.current?.paused) {
          audioRef.current.play().catch(() => {});
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

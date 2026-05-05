import { useEffect, useRef, useCallback } from 'react';

/**
 * useBackgroundAudio
 *
 * Plays a looping silent audio track via a native <audio> element to keep
 * the OS audio session alive. This prevents other apps (Spotify, YT Music)
 * from hijacking earbud hardware controls, because the OS sees our PWA as
 * the active audio session holder as long as *something* is playing.
 *
 * NOTE: We intentionally do NOT use AudioContext here. The OS gives native
 * <audio> elements special background execution privileges that AudioContext
 * doesn't get — AudioContext gets suspended when the app is backgrounded,
 * which is the opposite of what we want.
 */
const useBackgroundAudio = () => {
  const audioRef = useRef(null);

  const unlock = useCallback(() => {
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

  // Resume silent audio when the page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
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

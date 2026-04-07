import { useEffect, useRef } from 'react';

const useBackgroundAudio = () => {
  const silentAudioRef = useRef(null);

  const unlock = () => {
    if (silentAudioRef.current) return;

    const audio = new Audio('/silence.mp3');
    audio.loop = true;
    audio.volume = 0.001;
    audio.play().catch(() => {});
    silentAudioRef.current = audio;
  };

  useEffect(() => {
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  return silentAudioRef;
};

export default useBackgroundAudio;

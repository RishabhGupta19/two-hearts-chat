import { useEffect, useState } from 'react';
import { formatTimeIST } from '@/utils/timeFormat';

/**
 * Hook to display exact IST time
 */
export const useRealTimeTimestamp = (timestamp) => {
  const [displayTime, setDisplayTime] = useState(() => formatTimeIST(timestamp));

  useEffect(() => {
    if (!timestamp) return;

    // Update immediately
    setDisplayTime(formatTimeIST(timestamp));

    // Update every second to keep time current
    const interval = setInterval(() => {
      setDisplayTime(formatTimeIST(timestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return displayTime;
};

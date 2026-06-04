import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Countdown timer for the OA page.
 *
 * @param {number}   totalSeconds   - assessment duration in seconds
 * @param {Function} onExpire       - called when timer reaches 0
 * @param {boolean}  paused         - pause the timer (e.g. while submitting)
 *
 * @returns {{ secondsLeft, formattedTime, percentLeft, isExpired }}
 */
export function useAssessmentTimer(totalSeconds, onExpire, paused = false) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (paused || secondsLeft <= 0) return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [paused, secondsLeft > 0]);

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const percentLeft = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const isExpired = secondsLeft <= 0;

  return { secondsLeft, formattedTime, percentLeft, isExpired };
}
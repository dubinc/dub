import { useCallback, useEffect, useMemo, useState } from "react";

interface ITime {
  minutes: number;
  seconds: number;
}

export const useTimer = (minutes: number, timerLSName: string) => {
  const initialTime: ITime = useMemo(
    () => ({ minutes, seconds: 0 }),
    [minutes],
  );

  const [time, setTime] = useState<ITime>(initialTime);
  const [isTimerEnded, setIsTimerEnded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const formatTime = useCallback((part: number): string => {
    return part < 10 ? `0${part}` : part.toString();
  }, []);

  const resetTimer = useCallback(() => {
    setTime(initialTime);
    setIsTimerEnded(false);
    setIsTimerRunning(false);
    localStorage.removeItem(timerLSName);
    // Перезапускаем таймер
    setTimeout(() => setIsTimerRunning(true), 0);
  }, [initialTime, timerLSName]);

  useEffect(() => {
    const storedTime = localStorage.getItem(timerLSName);
    if (storedTime) {
      const parsedTime = JSON.parse(storedTime);
      setTime(parsedTime);
    }
    setIsTimerRunning(true);
  }, [timerLSName]);

  useEffect(() => {
    if (!isTimerRunning || isTimerEnded) return;

    const interval = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime.seconds === 0) {
          if (prevTime.minutes === 0) {
            setIsTimerEnded(true);
            setIsTimerRunning(false);
            return prevTime;
          }
          return { minutes: prevTime.minutes - 1, seconds: 59 };
        }
        return { ...prevTime, seconds: prevTime.seconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isTimerEnded]);

  useEffect(() => {
    if (isTimerRunning) {
      localStorage.setItem(timerLSName, JSON.stringify(time));
    }
  }, [time, timerLSName, isTimerRunning]);

  return {
    time,
    formatTime,
    isTimerEnded,
    resetTimer,
  };
};

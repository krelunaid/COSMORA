'use client';

import { useEffect, useState } from 'react';
import { eventDay, millisecondsUntilNextEventDay } from '@/lib/event-selection';

export function useEventDay() {
  const [today, setToday] = useState(() => eventDay());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(eventDay(now));
      timer = setTimeout(update, millisecondsUntilNextEventDay(now) + 50);
    };
    const resume = () => { if (!document.hidden) update(); };
    update();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
    };
  }, []);
  return today;
}

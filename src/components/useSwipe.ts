import { useRef } from 'react';

const MIN_SWIPE_PX = 50;

export function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (dx > MIN_SWIPE_PX) onRight();
      else if (dx < -MIN_SWIPE_PX) onLeft();
    },
  };
}

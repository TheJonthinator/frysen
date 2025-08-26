import { useRef } from "react";
export function useLongPress(onLong: () => void, ms = 500) {
  const t = useRef<number | null>(null);
  const start = (e: React.SyntheticEvent) => {
    e.preventDefault();
    t.current = window.setTimeout(onLong, ms);
  };
  const stop = () => { if (t.current) { clearTimeout(t.current); t.current = null; } };
  return { onMouseDown: start, onTouchStart: start, onMouseUp: stop, onMouseLeave: stop, onTouchEnd: stop };
}

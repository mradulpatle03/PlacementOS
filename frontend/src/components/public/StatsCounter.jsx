import { useEffect, useState, useRef } from "react";

/**
 * <StatsCounter value={87.5} suffix="%" duration={1200} />
 * Animates from 0 to value when it first enters the viewport.
 */
export default function StatsCounter({
  value = 0,
  suffix = "",
  prefix = "",
  duration = 1200,
  decimals = 0,
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const hasPlayed = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed.current) {
          hasPlayed.current = true;
          animate();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animate = () => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(step);
      else setDisplay(value);
    };
    requestAnimationFrame(step);
  };

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function CountingNumbers({
  value,
  className,
  start = 1000,
  interval = 10,
  duration = 800,
}: {
  value: number;
  className: string;
  start?: number;
  interval?: number;
  duration?: number;
}) {
  const [number, setNumber] = useState(start);
  const increment = Math.floor((start - value) / (duration / interval));
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      let timer = setInterval(() => {
        if (number > value) {
          setNumber((num) => {
            let newValue = num - increment;
            if (newValue < value) {
              newValue = value;
              if (timer) clearInterval(timer);
            }
            return newValue;
          });
        } else if (timer) {
          clearInterval(timer);
        }
      }, interval);
    }
  }, [isInView]);

  return (
    <p className={className} ref={ref}>
      {number}
    </p>
  );
}

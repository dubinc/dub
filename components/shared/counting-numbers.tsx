import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function CountingNumbers({
  value,
  className,
  reverse = false,
  start = reverse ? 1000 : 0,
  interval = 10,
  duration = 800,
}: {
  value: number;
  className: string;
  reverse?: boolean;
  start?: number;
  interval?: number;
  duration?: number;
}) {
  const [number, setNumber] = useState(start);
  let increment = Math.floor(Math.abs(start - value) / (duration / interval));
  if (increment === 0) {
    increment = 1;
  }
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      let timer = setInterval(() => {
        if (reverse) {
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
        } else {
          if (number < value) {
            setNumber((num) => {
              let newValue = num + increment;
              if (newValue > value) {
                newValue = value;
                if (timer) clearInterval(timer);
              }
              return newValue;
            });
          } else if (timer) {
            clearInterval(timer);
          }
        }
      }, interval);
    }
  }, [isInView]);

  return (
    <p className={className} ref={ref}>
      {Intl.NumberFormat().format(number)}
    </p>
  );
}

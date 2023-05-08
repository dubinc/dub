import { useCallback, useEffect, useState, RefObject } from "react";

export default function useScroll(
  threshold: number,
  ref?: RefObject<HTMLDivElement>,
) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => {
    if (ref && ref.current) {
      setScrolled(ref.current.scrollTop > threshold);
    } else {
      setScrolled(window.pageYOffset > threshold);
    }
  }, [threshold, ref]);

  useEffect(() => {
    if (ref && ref.current) {
      ref.current.addEventListener("scroll", onScroll);
      return () => ref.current?.removeEventListener("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll);
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, [onScroll, ref]);

  return scrolled;
}

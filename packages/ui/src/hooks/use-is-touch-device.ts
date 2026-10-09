import { useEffect, useState } from "react";

// true when the primary pointer is a finger, for example on a phone or tablet
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  return isTouchDevice;
}

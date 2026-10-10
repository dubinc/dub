import { useEffect, useState } from "react";

// true when the primary pointer is a finger, for example on a phone or tablet,
// and it updates when that changes, for example when a mouse is connected
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isTouchDevice;
}

import { useEffect, useState } from "react";

interface ViewportSize {
  width: number;
  height: number;
}

function getViewportSize(): ViewportSize {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export default function useViewportSize(): ViewportSize {
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    setViewportSize(getViewportSize());

    function handleResize() {
      setViewportSize(getViewportSize());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewportSize;
}

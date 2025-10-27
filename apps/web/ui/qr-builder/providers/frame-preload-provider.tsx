"use client";

import { preloadAllFrames } from "@/ui/qr-builder/constants/customization/frames.ts";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface FramePreloadContextType {
  isLoaded: boolean;
}

const FramePreloadContext = createContext<FramePreloadContextType>({
  isLoaded: false,
});

export const useFramePreload = () => useContext(FramePreloadContext);

interface FramePreloadProviderProps {
  children: ReactNode;
}

export const FramePreloadProvider = ({ children }: FramePreloadProviderProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFrames = async () => {
      try {
        await preloadAllFrames();
        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to preload frames:", error);
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => loadFrames(), { timeout: 5000 });
    } else {
      setTimeout(loadFrames, 100);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FramePreloadContext.Provider value={{ isLoaded }}>
      {children}
    </FramePreloadContext.Provider>
  );
}; 
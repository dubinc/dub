"use client";

import { FC, useEffect, useRef, useState } from "react";
import { EAnalyticEvents } from "../../interfaces/analytic.interface.ts";
import { trackClientEvents } from "../../services/analytic.service.ts";

interface IPageViewedTrackerProps {
  sessionId: string;
  pageName: string;
  params: { [key: string]: string | null };
}

const waitForGoogleAnalytics = (signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50;
    let timeoutId: NodeJS.Timeout;
    
    const checkGtag = () => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      attempts++;
      
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        resolve();
      } else if (attempts < maxAttempts) {
        timeoutId = setTimeout(checkGtag, 100);
      } else {
        resolve();
      }
    };

    signal?.addEventListener('abort', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new Error('Aborted'));
    });
    
    checkGtag();
  });
};

export const PageViewedTrackerComponent: FC<
  Readonly<IPageViewedTrackerProps>
> = ({ sessionId, pageName, params }) => {
  const [isReady, setIsReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    waitForGoogleAnalytics(abortControllerRef.current.signal)
      .then(() => {
        if (mountedRef.current) {
          setIsReady(true);
        }
      })
      .catch((error) => {
        if (error.message !== 'Aborted' && mountedRef.current) {
          console.warn('Failed to wait for Google Analytics:', error);
          setIsReady(true);
        }
      });

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isReady && mountedRef.current) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_VIEWED,
        params: {
          page_name: pageName,
          ...params,
        },
        sessionId,
      });
    }
  }, [isReady, pageName, sessionId, params]);

  return null;
};

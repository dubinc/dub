'use client';

import { useEffect } from 'react';
import { useScriptContext } from './script-context';

export const SupportChatbot = () => {
  const { scriptsLoaded } = useScriptContext();

  useEffect(() => {
    // Only set up listeners after scripts are loaded
    console.log('scriptsLoaded', scriptsLoaded);
    if (!scriptsLoaded) {
      return;
    }
    const bpIframe: HTMLIFrameElement | null = document.querySelector('.bpFab');
    const bpWebChatIframe: HTMLIFrameElement | null =
      document.querySelector('.bpWebchat');

    if (bpIframe) {
      bpIframe.style.display = 'block';
    }

    if (bpWebChatIframe) {
      bpWebChatIframe.style.display = 'block';
    }

    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLAnchorElement &&
        event.target.id === 'cancellation-bot'
      ) {
        event.preventDefault();
        if (window.botpress) {
          window.botpress.open();
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      const bpIframeCleanup: HTMLIFrameElement | null = document.querySelector('.bpFab');
      const bpWebChatIframeCleanup: HTMLIFrameElement | null =
        document.querySelector('.bpWebchat');

      if (bpIframeCleanup) {
        bpIframeCleanup.style.display = 'none';
      }

      if (bpWebChatIframeCleanup) {
        bpWebChatIframeCleanup.style.display = 'none';
      }

      document.removeEventListener('click', handleClick);
    };
  }, [scriptsLoaded]);

  return null;
};

'use client';

import { useEffect } from 'react';

export const SupportChatbot = () => {
  useEffect(() => {
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
  }, []);

  return null;
};

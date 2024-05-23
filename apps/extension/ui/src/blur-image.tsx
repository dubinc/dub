import React, { useState, useEffect, ReactNode } from 'react';

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function BlurImage(props: ImageProps): JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [src, setSrc] = useState<string>(props.src);

  useEffect(() => {
    setSrc(props.src);
  }, [props.src]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    setLoading(false);
    const target = e.target as HTMLImageElement;
    if (target.naturalWidth <= 16 && target.naturalHeight <= 16) {
      setSrc(`https://avatar.vercel.sh/${encodeURIComponent(props.alt)}`);
    }
  };

  const onError = (): void => {
    setSrc(`https://avatar.vercel.sh/${encodeURIComponent(props.alt)}`);
  };

  const className = loading ? 'blur-[2px]' : 'blur-0';

  return (
    <img
      {...props}
      src={src}
      alt={props.alt}
      className={`${className} ${props.className || ''}`}
      onLoad={handleLoad}
      onError={onError}
    />
  );
}

import Image, { ImageProps } from "next/future/image";
import { useState, useEffect } from "react";

export default function BlurImage(props: ImageProps) {
  const [isLoading, setLoading] = useState(true);
  const [src, setSrc] = useState(props.src);
  useEffect(() => setSrc(props.src), [props.src]); // update the `src` value when the `prop.src` value changes

  return (
    <Image
      {...props}
      src={src}
      alt={props.alt}
      className={`${props.className} ${
        isLoading ? "grayscale blur-md" : "grayscale-0 blur-0"
      }`}
      onLoadingComplete={async () => {
        setLoading(false);
      }}
      onError={() => {
        setSrc(`https://avatar.tobi.sh/${props.alt}`); // if the image fails to load, use the default avatar
      }}
    />
  );
}

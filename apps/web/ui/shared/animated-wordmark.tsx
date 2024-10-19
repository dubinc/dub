"use client";

import { Wordmark } from "@dub/ui";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function AnimatedWordmark() {
  return (
    <div className="group relative h-6">
      <Wordmark className="absolute h-6 group-hover:opacity-0" />
      <DotLottieReact
        src="https://assets.dub.co/misc/animated-wordmark.lottie"
        playOnHover
        loop
        className="absolute h-6 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

"use client";

import Confetti from "canvas-confetti";
import { memo, useEffect } from "react";

export const ProgramInviteConfetti = memo(() => {
  useEffect(() => {
    [0.25, 0.5, 0.75].forEach((x) =>
      Confetti({
        particleCount: 50,
        startVelocity: 90,
        spread: 120,
        ticks: 1000,
        origin: { x, y: 0 },
        disableForReducedMotion: true,
      }),
    );

    return () => Confetti.reset();
  }, []);

  return null;
});

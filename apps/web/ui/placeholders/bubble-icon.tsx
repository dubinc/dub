"use client";

import { PropsWithChildren, useEffect, useRef } from "react";

export function BubbleIcon({ children }: PropsWithChildren) {
  const ref = useRef<HTMLDivElement>(null);

  // Pass relative mouse position to the element
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;

      const boundingRect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty(
        "--mx",
        ((e.clientX - boundingRect.left) / boundingRect.width).toString(),
      );
      ref.current.style.setProperty(
        "--my",
        ((e.clientY - boundingRect.top) / boundingRect.height).toString(),
      );
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [ref]);

  return (
    <div
      ref={ref}
      className="rounded-full [perspective:500px]"
      style={{
        filter: `
            drop-shadow(0 3px 6px #5242511A)
            drop-shadow(0 12px 12px #52425117)
            drop-shadow(0 26px 16px #5242510D)
            drop-shadow(0 47px 19px #52425103)
            drop-shadow(0 73px 20px #52425100)
          `,
      }}
    >
      <div
        className="relative rounded-full bg-gradient-to-b from-neutral-100 to-neutral-300 p-px transition-[transform] duration-[50ms]"
        style={{
          transform: `rotateY(clamp(-20deg, calc(var(--mx, 0.5) * 4deg), 20deg)) rotateX(clamp(-20deg, calc(var(--my, 0.5) * -4deg), 20deg))`,
        }}
      >
        <div className="flex size-[104px] items-center justify-center rounded-full bg-gradient-to-b from-white to-neutral-100">
          {children}
        </div>

        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#fff8]" />

        <div
          className="absolute inset-0 rounded-full opacity-70 blur-sm"
          style={{
            backgroundImage: `
            radial-gradient(circle at 0% 100%, #ffdbe5, transparent 40%),
            radial-gradient(circle at 50% 120%, #c8cff8, transparent 30%),
            radial-gradient(circle at 100% 100%, #ccfac8, transparent 40%)
          `,
          }}
        />
      </div>
    </div>
  );
}

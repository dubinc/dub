"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { AnimatePresence, motion } from "framer-motion";
import { useSpring } from "react-spring";
import { Drag, X } from "@/components/shared/icons";
import useIntersectionObserver from "#/lib/hooks/use-intersection-observer";

interface MarkerProps {
  location: [number, number];
  size: number;
}

export default function GlobeClient({ markers }: { markers: MarkerProps[] }) {
  const divRef = useRef<any>();
  const entry = useIntersectionObserver(divRef, {});
  const isVisible = !!entry?.isIntersecting;
  const [showGlobe, setShowGlobe] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowGlobe(true);
    } else {
      setShowGlobe(false);
    }
  }, [isVisible]);

  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = window.document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      (ctx as any).getSupportedExtensions();
    } catch (e) {
      // WebGL isn't properly supported
      setWebglSupported(false);
      console.log("WebGL not supported, hiding globe animation...");
      return;
    }
  }, []);

  return (
    <div
      ref={divRef}
      className={`${
        webglSupported ? "min-h-[500px] sm:min-h-[1000px]" : "min-h-[50px]"
      } h-full`}
    >
      {webglSupported && showGlobe && (
        <GlobeAnimation markers={markers || []} />
      )}
    </div>
  );
}

const GlobeAnimation = ({ markers }: { markers: MarkerProps[] }) => {
  const canvasRef = useRef<any>();
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);

  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 60,
      precision: 0.001,
    },
  }));

  useEffect(() => {
    let phi = -0.5;
    let width = 0;
    const onResize = () =>
      canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener("resize", onResize);
    onResize();
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 1,
      width,
      height: width,
      phi,
      theta: 0.15,
      dark: 0,
      diffuse: 1.2,
      scale: 1,
      mapSamples: 20000,
      mapBrightness: 4,
      baseColor: [1, 1, 1],
      markerColor: [249 / 255, 115 / 255, 22 / 255],
      offset: [0, 0],
      glowColor: [0.8, 0.8, 0.8],
      markers: markers || [],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        phi += 0.002;
        state.phi = phi + r.get();
        state.width = width;
        state.height = width;
      },
    });
    setTimeout(() => (canvasRef.current.style.opacity = "1"));
    return () => globe.destroy();
  }, [markers]);

  const [showModal, setShowModal] = useState(true);

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="globe-modal"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="group absolute left-0 right-0 z-10 mx-auto max-w-sm rounded-md border border-gray-200 bg-white bg-opacity-90 px-5 py-4 shadow-md backdrop-blur-md sm:py-7"
          >
            <button
              className="group visible absolute right-0 top-0 float-right m-3 rounded-full p-1 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:scale-75 group-hover:visible sm:invisible"
              autoFocus={false}
              onClick={() => setShowModal(false)}
            >
              <span className="sr-only">Spin Globe</span>
              <X className="h-4 w-4" />
            </button>
            <Drag className="mx-auto mb-2 h-12 w-12 text-gray-700 sm:mb-4" />
            <p className="text-center text-sm text-gray-700 sm:text-base">
              This map shows the locations of the last 50 clicks on{" "}
              <a
                className="font-semibold text-blue-800"
                href="https://dub.sh/github"
                target="_blank"
                rel="noreferrer"
              >
                dub.sh/github
              </a>
              .
            </p>
            <Link
              href="/stats/github"
              className="mx-auto mt-2 block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white hover:bg-white hover:text-black sm:mt-4"
            >
              View all stats
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          aspectRatio: "1",
          margin: "auto",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            pointerInteracting.current =
              e.clientX - pointerInteractionMovement.current;
            canvasRef.current.style.cursor = "grabbing";
          }}
          onPointerUp={() => {
            pointerInteracting.current = null;
            canvasRef.current.style.cursor = "grab";
          }}
          onPointerOut={() => {
            pointerInteracting.current = null;
            canvasRef.current.style.cursor = "grab";
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta;
              api.start({
                r: delta / 200,
              });
            }
          }}
          onTouchMove={(e) => {
            if (pointerInteracting.current !== null && e.touches[0]) {
              const delta = e.touches[0].clientX - pointerInteracting.current;
              pointerInteractionMovement.current = delta;
              api.start({
                r: delta / 100,
              });
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            contain: "layout paint size",
            opacity: 0,
            transition: "opacity 1s ease",
          }}
        />
      </div>
    </div>
  );
};

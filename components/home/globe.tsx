import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import createGlobe from "cobe";
import { useSpring } from "react-spring";
import useSWR from "swr";
import { Drag, X } from "@/components/shared/icons";
import { fetcher } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import useIntersectionObserver from "@/lib/hooks/use-intersection-observer";

interface MarkerProps {
  location: [number, number];
  size: number;
}

export default function Globe({ hostname }: { hostname?: string }) {
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

  const [webglSupported, setWebglSupported] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    try {
      const canvas = window.document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      (ctx as any).getSupportedExtensions();
      setWebglSupported(true);
    } catch (e) {
      // WebGL isn't properly supported
      console.log(
        "WebGL not supported, hiding globe animation and showing fallback video..."
      );
      setShowFallback(true);
      return;
    }
  }, []);

  const { data: markers } = useSWR<MarkerProps[]>(
    `/api/edge/coordinates${hostname ? `?hostname=${hostname}` : ""}`,
    fetcher
  );

  return (
    <div ref={divRef} className="h-full min-h-[500px] sm:min-h-[1000px]">
      {webglSupported && showGlobe && (
        <GlobeAnimation hostname={hostname} markers={markers} />
      )}
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center">
          <video
            autoPlay
            src="https://res.cloudinary.com/dubdotsh/video/upload/v1664203052/globe-animation-fallback.mp4"
            loop
            muted
            playsInline
            width={968}
            height={946}
          />
        </div>
      )}
    </div>
  );
}

const GlobeAnimation = ({
  hostname,
  markers,
}: {
  hostname?: string;
  markers: MarkerProps[];
}) => {
  const canvasRef = useRef<any>();
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);

  const DPR = 1;

  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 40,
      precision: 0.001,
    },
  }));

  useEffect(() => {
    let phi = 0;
    let width = 0;
    const onResize = () =>
      canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener("resize", onResize);
    onResize();
    const globe = createGlobe(canvasRef.current, {
      context: {
        antialias: false,
      },
      devicePixelRatio: DPR,
      width: width * DPR,
      height: width * DPR,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 3,
      mapSamples: 20000,
      mapBrightness: 4,
      baseColor: [1, 1, 1],
      markerColor: [249 / 255, 115 / 255, 22 / 255],
      // rgb(249, 115, 22)
      glowColor: [0.8, 0.8, 0.8],
      markers: markers || [],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        phi += 0.002;
        state.phi = phi + r.get();
        state.width = width * DPR;
        state.height = width * DPR;
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
            className="group absolute left-0 right-0 mx-auto z-10 max-w-sm px-5 py-4 sm:py-7 rounded-md bg-white border border-gray-200 shadow-md bg-opacity-90 backdrop-blur-md"
          >
            <button
              className="visible sm:invisible group-hover:visible absolute top-0 right-0 p-1 m-3 rounded-full float-right group hover:bg-gray-100 focus:outline-none active:scale-75 transition-all duration-75"
              autoFocus={false}
              onClick={() => setShowModal(false)}
            >
              <span className="sr-only">Spin Globe</span>
              <X className="w-4 h-4" />
            </button>
            <Drag className="h-12 w-12 mx-auto mb-2 sm:mb-4 text-gray-700" />
            <p className="text-center text-gray-700 text-sm sm:text-base">
              This map shows the locations of the last 30 clicks on{" "}
              <a
                className="text-blue-800 font-semibold"
                href={
                  hostname ? `https://${hostname}` : "https://dub.sh/github"
                }
                target="_blank"
                rel="noreferrer"
              >
                {hostname || "dub.sh/github"}
              </a>{" "}
              in real time.
            </p>
            {!hostname && (
              <Link
                href={{ pathname: "/", query: { key: "github" } }}
                as="/stats/github"
                shallow
                scroll={false}
              >
                <a className="rounded-full px-4 py-1.5 bg-black text-white hover:bg-white hover:text-black text-sm border border-black mx-auto mt-2 sm:mt-4 block max-w-fit">
                  View all stats
                </a>
              </Link>
            )}
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

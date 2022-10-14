import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useDebouncedCallback } from "use-debounce";
import { useLinkQRModal } from "@/components/app/modals/link-qr-modal";
import BlurImage from "@/components/shared/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { Chart, LoadingDots, QR } from "@/components/shared/icons";
import { FRAMER_MOTION_LIST_ITEM_VARIANTS } from "@/lib/constants";
import { SimpleLinkProps } from "@/lib/types";
import { fetcher, linkConstructor, nFormatter } from "@/lib/utils";

export default function LinkCard({
  _key: key,
  url,
  hashes,
  setHashes,
}: {
  _key: string;
  url: string;
  hashes?: SimpleLinkProps[];
  setHashes?: (hashes: SimpleLinkProps[]) => void;
}) {
  const urlHostname = new URL(url).hostname;

  const { data: clicks, isValidating } = useSWR<string>(
    `/api/edge/links/${key}/clicks`,
    fetcher,
  );

  const cardElem = useRef(null);

  const x = useMotionValue(0);
  const controls = useAnimation();

  const [constrained, setConstrained] = useState(true);

  const [velocity, setVelocity] = useState<number>();

  const isDelete = (childNode, parentNode) => {
    const childRect = childNode.getBoundingClientRect();
    const parentRect = parentNode.getBoundingClientRect();
    return parentRect.left >= childRect.right ||
      parentRect.right <= childRect.left
      ? true
      : undefined;
  };

  // determine direction of swipe based on velocity
  const direction = useMemo(() => {
    return velocity >= 1 ? "right" : velocity <= -1 ? "left" : undefined;
  }, [velocity]);

  const flyAway = (min) => {
    const flyAwayDistance = (direction) => {
      const parentWidth =
        cardElem.current.parentNode.getBoundingClientRect().width;
      const childWidth = cardElem.current.getBoundingClientRect().width;
      return direction === "left"
        ? -parentWidth / 2 - childWidth / 2
        : parentWidth / 2 + childWidth / 2;
    };
    if (direction && Math.abs(velocity) > min) {
      console.log("flying away");
      setConstrained(false);
      controls.start({
        x: flyAwayDistance(direction),
      });
    }
  };

  const sendErrorToast = useDebouncedCallback(
    () => toast.error("Cannot delete default link."),
    100,
  );

  useEffect(() => {
    const unsubscribeX = x.onChange(() => {
      if (cardElem.current) {
        const childNode = cardElem.current;
        const parentNode = cardElem.current.parentNode;
        const deleted = isDelete(childNode, parentNode);
        if (deleted) {
          if (hashes && setHashes) {
            setHashes(hashes.filter((hash) => hash.key !== key));
            toast.success("Link deleted.");
          } else {
            sendErrorToast(); // debounce to prevent multiple toasts
          }
        }
      }
    });

    return () => unsubscribeX();
  });

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {
      key,
      url,
    },
  });

  return (
    <motion.li variants={FRAMER_MOTION_LIST_ITEM_VARIANTS}>
      <LinkQRModal />
      <motion.div
        animate={controls}
        drag="x"
        dragConstraints={constrained && { left: 0, right: 0 }}
        dragElastic={1}
        ref={cardElem}
        style={{ x }}
        onDrag={() => setVelocity(x.getVelocity())}
        onDragEnd={() => flyAway(500)}
        whileTap={{ scale: 1.05 }}
        className="cursor-grab active:cursor-grabbing flex items-center space-x-3 border border-gray-200 hover:border-black bg-white p-3 max-w-md rounded-md transition-[border-color]"
      >
        <BlurImage
          src={`https://www.google.com/s2/favicons?sz=64&domain_url=${urlHostname}`}
          alt={urlHostname}
          className="w-10 h-10 rounded-full pointer-events-none"
          width={20}
          height={20}
        />
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <a
              className="text-blue-800 font-semibold"
              href={linkConstructor({ key })}
              target="_blank"
              rel="noreferrer"
            >
              {linkConstructor({ key, pretty: true })}
            </a>
            <CopyButton url={linkConstructor({ key })} />
            <button
              onClick={() => setShowLinkQRModal(true)}
              className="group p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all duration-75"
            >
              <span className="sr-only">Copy</span>
              <QR className="text-gray-700 group-hover:text-blue-800 transition-all" />
            </button>
            <Link
              href={{ pathname: "/", query: { key } }}
              as={`/stats/${encodeURI(key)}`}
              shallow
              scroll={false}
            >
              <a className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 hover:scale-105 active:scale-95 transition-all duration-75 text-gray-700">
                <Chart className="w-4 h-4" />
                <p className="text-sm">
                  {isValidating || !clicks ? (
                    <LoadingDots color="#71717A" />
                  ) : (
                    nFormatter(parseInt(clicks))
                  )}
                  <span className="hidden sm:inline-block ml-1">clicks</span>
                </p>
              </a>
            </Link>
          </div>
          <p className="text-sm text-gray-500 truncate w-72">{url}</p>
        </div>
      </motion.div>
    </motion.li>
  );
}

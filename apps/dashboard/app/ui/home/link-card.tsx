import Link from "next/link";
import { useRef } from "react";
import useSWR from "swr";
import { useAddEditLinkModal } from "#/ui/modals/add-edit-link-modal";
import { useLinkQRModal } from "#/ui/modals/link-qr-modal";
import BlurImage from "#/ui/blur-image";
import CopyButton from "@/components/shared/copy-button";
import { QrCode } from "lucide-react";
import { Chart, ThreeDots } from "@/components/shared/icons";
import { LoadingDots } from "#/ui/icons";
import { DEFAULT_LINK_PROPS, GOOGLE_FAVICON_URL } from "#/lib/constants";
import { SimpleLinkProps } from "#/lib/types";
import {
  fetcher,
  getApexDomain,
  linkConstructor,
  nFormatter,
} from "#/lib/utils";
import Number from "#/ui/number";

export default function LinkCard({
  _key: key,
  url,
}: {
  _key: string;
  url: string;
  hashes?: SimpleLinkProps[];
  setHashes?: (hashes: SimpleLinkProps[]) => void;
  setShowDefaultLink?: (showDefaultLink: boolean) => void;
}) {
  const apexDomain = getApexDomain(url);

  const cardElem = useRef<HTMLDivElement | null>(null);

  const { showLinkQRModal, setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {
      key,
      url,
    },
  });

  const { showAddEditLinkModal, setShowAddEditLinkModal, AddEditLinkModal } =
    useAddEditLinkModal({
      props: {
        ...DEFAULT_LINK_PROPS,
        key,
        url,
      },
      homepageDemo: true,
    });

  const { data: clicks } = useSWR<number>(
    `/api/edge/links/${key}/stats/clicks`,
    fetcher,
    {
      // avoid revalidation on focus when modals are open to prevent rerendering
      revalidateOnFocus: !showLinkQRModal && !showAddEditLinkModal,
    },
  );

  return (
    <li>
      <LinkQRModal />
      <AddEditLinkModal />
      <div
        ref={cardElem}
        className="flex max-w-xl items-center justify-between rounded-md border border-gray-200 bg-white p-3 shadow-lg transition-[border-color]"
      >
        <div className="flex items-center space-x-3">
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="pointer-events-none h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <a
                className="font-semibold text-blue-800"
                href={linkConstructor({ key })}
                target="_blank"
                rel="noreferrer"
              >
                {linkConstructor({ key, pretty: true })}
              </a>
              <CopyButton url={linkConstructor({ key })} />
              <button
                onClick={() => setShowLinkQRModal(true)}
                className="group rounded-full bg-gray-100 p-1.5 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95"
              >
                <span className="sr-only">Copy</span>
                <QrCode className="h-4 w-4 text-gray-700 transition-all group-hover:text-blue-800" />
              </button>
              <Number value={clicks}>
                <Link
                  href={`/stats/${encodeURI(key)}`}
                  className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 transition-all duration-75 hover:scale-105 active:scale-95"
                >
                  <Chart className="h-4 w-4" />
                  <p className="text-sm">
                    {!clicks && clicks !== 0 ? (
                      <LoadingDots color="#71717A" />
                    ) : (
                      nFormatter(clicks)
                    )}
                    <span className="ml-1 hidden sm:inline-block">clicks</span>
                  </p>
                </Link>
              </Number>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-1 w-72 text-sm text-gray-500 underline-offset-2 transition-all hover:text-gray-800 hover:underline"
            >
              {url}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddEditLinkModal(true)}
          className="rounded-md px-1 py-2 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200"
        >
          <span className="sr-only">Edit</span>
          <ThreeDots className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </li>
  );
}

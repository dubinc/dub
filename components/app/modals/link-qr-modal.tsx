import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import BlurImage from "@/components/shared/blur-image";
import { Download, Logo } from "@/components/shared/icons";
import Modal from "@/components/shared/modal";
import { getQRAsCanvas, getQRAsSVGDataUri, QRCodeSVG } from "@/lib/qr";
import useProject from "@/lib/swr/use-project";
import { LinkProps } from "@/lib/types";
import { linkConstructor } from "@/lib/utils";

function LinkQRModalHelper({
  showLinkQRModal,
  setShowLinkQRModal,
  props,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  const anchorRef = useRef<HTMLAnchorElement>();
  const { project: { domain, logo } = {} } = useProject();
  const avatarUrl = useMemo(() => {
    try {
      const urlHostname = new URL(props.url).hostname;
      return `https://logo.clearbit.com/${urlHostname}`;
    } catch (e) {
      return null;
    }
  }, [props]);

  const qrDestUrl = useMemo(
    () => linkConstructor({ key: props.key, domain }),
    [props, domain]
  );
  const qrLogoUrl = useMemo(() => logo || new URL('/static/logo.svg', location.href).href, []);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
  }

  const [qrData, setQrData] = useState({
    bgColor: "#ffffff",
    fgColor: "#000000",
    size: 1024,
    level: "Q",
    imageSettings: {
      src: qrLogoUrl,
      height: 256,
      width: 256,
      excavate: true,
    },
  });

  return (
    <Modal showModal={showLinkQRModal} setShowModal={setShowLinkQRModal}>
      <div className="inline-block w-full sm:max-w-md overflow-hidden align-middle transition-all transform bg-white sm:border sm:border-gray-200 shadow-xl sm:rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          {avatarUrl ? (
            <BlurImage
              src={avatarUrl}
              alt="Download QR Code"
              className="w-10 h-10 rounded-full border border-gray-200"
              width={40}
              height={40}
            />
          ) : (
            <Logo className="w-10 h-10" />
          )}
          <h3 className="font-medium text-lg">Download QR Code</h3>
        </div>

        <div className="flex flex-col space-y-8 text-left bg-gray-50 sm:px-16 px-4 py-8">
          <div className="p-4 rounded-lg bg-white mx-auto border-2 border-gray-200">
            <QRCodeSVG
              value={qrDestUrl}
              size={128}
              bgColor={qrData.bgColor}
              fgColor={qrData.fgColor}
              level="Q"
              includeMargin={false}
              imageSettings={{
                src: qrLogoUrl,
                height: 36,
                width: 36,
                excavate: true
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                download(
                  getQRAsSVGDataUri({
                    value: qrDestUrl,
                    ...qrData,
                  }),
                  "svg"
                )
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> SVG
            </button>
            <button
              onClick={async () => 
                download(
                  await getQRAsCanvas(
                    { value: qrDestUrl, ...qrData },
                    "image/png"
                  ),
                  "png"
                )
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> PNG
            </button>
            <button
              onClick={
                async () => 
                download(
                  await getQRAsCanvas(
                    { value: qrDestUrl, ...qrData },
                    "image/jpeg"
                  ),
                  "jpg"
                )
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> JPEG
            </button>
          </div>

          {/* This will be used to prompt downloads. */}
          <a className="hidden" download={`${props.key}-qrcode.svg`} ref={anchorRef} />
        </div>
      </div>
    </Modal>
  );
}

export function useLinkQRModal({ props }: { props: LinkProps }) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModal = useCallback(() => {
    return (
      <LinkQRModalHelper
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        props={props}
      />
    );
  }, [showLinkQRModal, setShowLinkQRModal, props]);

  return useMemo(
    () => ({ setShowLinkQRModal, LinkQRModal }),
    [setShowLinkQRModal, LinkQRModal]
  );
}

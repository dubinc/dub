import { getQRData } from "@/lib/qr";
import { QRCodeDesign } from "@/lib/qr/types";
import useDomain from "@/lib/swr/use-domain";
import useWorkspace from "@/lib/swr/use-workspace";
import { QRLinkProps } from "@/lib/types";
import {
  InfoTooltip,
  Modal,
  Tooltip,
  TooltipContent,
  useLocalStorage,
} from "@dub/ui";
import { Crown } from "@dub/ui/icons";
import { DUB_QR_LOGO, linkConstructor } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ProBadgeTooltip } from "../shared/pro-badge-tooltip";
import {
  DEFAULT_QR_DESIGN,
  QRCodeDesignFields,
  SegmentTab,
  SegmentedControl,
} from "./qr-code-design-fields";

export type { QRCodeDesign };

type LinkQRModalProps = {
  props: QRLinkProps;
  onSave?: (data: QRCodeDesign) => void;
};

function LinkQRModal(
  props: {
    showLinkQRModal: boolean;
    setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  } & LinkQRModalProps,
) {
  return (
    <Modal
      showModal={props.showLinkQRModal}
      setShowModal={props.setShowLinkQRModal}
      className="max-w-[500px]"
    >
      <LinkQRModalInner {...props} />
    </Modal>
  );
}

function LinkQRModalInner({
  props,
  onSave,
  showLinkQRModal,
  setShowLinkQRModal,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
} & LinkQRModalProps) {
  const { id: workspaceId, slug, plan, logo: workspaceLogo } = useWorkspace();
  const { logo: domainLogo } = useDomain({
    slug: props.domain,
    enabled: showLinkQRModal,
  });

  const isPro = plan && plan !== "free";

  const url = useMemo(
    () =>
      props.key && props.domain
        ? linkConstructor({ key: props.key, domain: props.domain })
        : undefined,
    [props.key, props.domain],
  );

  const [dataPersisted, setDataPersisted] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-${workspaceId}`,
    DEFAULT_QR_DESIGN,
  );

  const [data, setData] = useState<QRCodeDesign>(dataPersisted);

  const hideLogo = data.hideLogo && !!isPro;
  const logo = !isPro
    ? DUB_QR_LOGO
    : domainLogo || workspaceLogo || DUB_QR_LOGO;

  const qrData = useMemo(
    () =>
      url
        ? getQRData({
            url,
            fgColor: data.fgColor,
            hideLogo,
            logo,
            dotStyle: data.dotStyle,
            markerCenterStyle: data.markerCenterStyle,
            markerBorderStyle: data.markerBorderStyle,
            markerColor: data.markerColor,
          })
        : null,
    [url, data, hideLogo, logo],
  );

  return (
    <form
      className="flex flex-col gap-6 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowLinkQRModal(false);
        setDataPersisted(data);
        onSave?.(data);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">QR Code</h3>
          <ProBadgeTooltip content="Set a custom QR code design to improve click-through rates. [Learn more.](https://dub.co/help/article/custom-qr-codes)" />
        </div>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-neutral-700">
                Press{" "}
                <strong className="font-medium text-neutral-950">Q</strong> to
                open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              Q
            </kbd>
          </Tooltip>
        </div>
      </div>

      <QRCodeDesignFields
        data={data}
        setData={setData}
        url={url}
        logo={logo}
        linkProps={props}
        qrData={qrData}
        onClose={() => setShowLinkQRModal(false)}
        logoSection={
          <div>
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-neutral-700">
                Logo
              </label>
              <InfoTooltip content="Display your logo in the center of the QR code. [Learn more.](https://dub.co/help/article/custom-qr-codes)" />
            </div>
            <SegmentedControl
              activeIndex={data.hideLogo && isPro ? 1 : 0}
              count={2}
              disabled={!isPro}
            >
              <SegmentTab
                active={!data.hideLogo || !isPro}
                onClick={() => setData((d) => ({ ...d, hideLogo: false }))}
                disabled={!isPro}
              >
                <span className="text-sm">Show</span>
              </SegmentTab>
              <SegmentTab
                active={!!(data.hideLogo && isPro)}
                onClick={() => setData((d) => ({ ...d, hideLogo: true }))}
                disabled={!isPro}
              >
                {!isPro && (
                  <Tooltip
                    content={
                      <TooltipContent
                        title="Upgrade to Pro to show or hide your QR code logo."
                        cta="Upgrade to Pro"
                        href={
                          slug ? `/${slug}/upgrade` : "https://dub.co/pricing"
                        }
                        target="_blank"
                      />
                    }
                  >
                    <Crown className="text-content-default mr-1 size-4" />
                  </Tooltip>
                )}
                <span className="text-sm">Hide</span>
              </SegmentTab>
            </SegmentedControl>
          </div>
        }
      />
    </form>
  );
}

export function useLinkQRModal(props: LinkQRModalProps) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModalCallback = useCallback(
    () => (
      <LinkQRModal
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        {...props}
      />
    ),
    [showLinkQRModal, setShowLinkQRModal, props],
  );

  return useMemo(
    () => ({ setShowLinkQRModal, LinkQRModal: LinkQRModalCallback }),
    [setShowLinkQRModal, LinkQRModalCallback],
  );
}

import { getQRData } from "@/lib/qr";
import { QRCodeDesign } from "@/lib/qr/types";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { QRLinkProps } from "@/lib/types";
import { InfoTooltip, Modal, useLocalStorage } from "@dub/ui";
import { linkConstructor } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { DEFAULT_QR_DESIGN, QRCodeDesignFields } from "./qr-code-design-fields";

export type { QRCodeDesign };

type PartnerLinkQRModalProps = {
  props: QRLinkProps;
  onSave?: (data: QRCodeDesign) => void;
};

function PartnerLinkQRModal(
  props: {
    showLinkQRModal: boolean;
    setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  } & PartnerLinkQRModalProps,
) {
  return (
    <Modal
      showModal={props.showLinkQRModal}
      setShowModal={props.setShowLinkQRModal}
      className="max-w-[500px]"
    >
      <PartnerLinkQRModalInner {...props} />
    </Modal>
  );
}

function PartnerLinkQRModalInner({
  props,
  onSave,
  setShowLinkQRModal,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
} & PartnerLinkQRModalProps) {
  const { programEnrollment } = useProgramEnrollment();
  const { logo } = programEnrollment?.program ?? {};

  const url = useMemo(
    () =>
      props.key && props.domain
        ? linkConstructor({ key: props.key, domain: props.domain })
        : undefined,
    [props.key, props.domain],
  );

  const [dataPersisted, setDataPersisted] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-program-${programEnrollment?.program?.id}`,
    DEFAULT_QR_DESIGN,
  );

  const [data, setData] = useState<QRCodeDesign>(dataPersisted);

  const qrData = useMemo(
    () =>
      url
        ? getQRData({
            url,
            fgColor: data.fgColor,
            logo: logo ?? undefined,
            dotStyle: data.dotStyle,
            markerCenterStyle: data.markerCenterStyle,
            markerBorderStyle: data.markerBorderStyle,
            markerColor: data.markerColor,
          })
        : null,
    [url, data, logo],
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
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">QR Code</h3>
        <InfoTooltip content="Set a custom QR code design to improve click-through rates. [Learn more.](https://dub.co/help/article/custom-qr-codes)" />
      </div>

      <QRCodeDesignFields
        data={data}
        setData={setData}
        url={url}
        logo={logo ?? undefined}
        linkProps={props}
        qrData={qrData}
        onClose={() => setShowLinkQRModal(false)}
      />
    </form>
  );
}

export function usePartnerLinkQRModal(props: PartnerLinkQRModalProps) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModalCallback = useCallback(
    () => (
      <PartnerLinkQRModal
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        {...props}
      />
    ),
    [showLinkQRModal, setShowLinkQRModal],
  );

  return useMemo(
    () => ({ setShowLinkQRModal, LinkQRModal: LinkQRModalCallback }),
    [setShowLinkQRModal, LinkQRModalCallback],
  );
}

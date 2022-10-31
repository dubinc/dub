import { getQRAsCanvas, getQRAsSVGDataUri } from "@/lib/qr";
import { useState } from "react";
import IconMenu from "./icon-menu";
import { Download, Image } from "./icons";
import Popover from "./popover";

interface IQrDropdownProps {
  download: (url: string, extension: string) => void;
  showLogo: boolean;
  logo: string;
  qrData: {
    imageSettings: {
      src: string;
      height: number;
      width: number;
      excavate: boolean;
    };
    value: string;
    bgColor: string;
    fgColor: string;
    size: number;
    level: string;
  };
}

export default function QrDropdown({
  download,
  qrData,
  showLogo,
  logo,
}: IQrDropdownProps) {
  const [openPopover, setOpenPopover] = useState(false);
  return (
    <>
      <Popover
        content={
          <div className="grid w-full gap-1 p-2 sm:w-40">
            <button
              onClick={async () => {
                setOpenPopover(false);
                download(
                  await getQRAsSVGDataUri({
                    ...qrData,
                    ...(showLogo && {
                      imageSettings: {
                        ...qrData.imageSettings,
                        src: logo || "https://dub.sh/_static/logo.svg",
                      },
                    }),
                  }),
                  "svg",
                );
              }}
              className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
            >
              <IconMenu text="SVG" icon={<Image className="h-4 w-4" />} />
            </button>
            <button
              onClick={async () => {
                setOpenPopover(false);
                download(await getQRAsCanvas(qrData, "image/png"), "png");
              }}
              className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
            >
              <IconMenu text="PNG" icon={<Image className="h-4 w-4" />} />
            </button>
            <button
              onClick={async () => {
                setOpenPopover(false);
                download(await getQRAsCanvas(qrData, "image/jpeg"), "jpg");
              }}
              className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
            >
              <IconMenu text="JPEG" icon={<Image className="h-4 w-4" />} />
            </button>
          </div>
        }
        align="center"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
        >
          <Download />
          Download
        </button>
      </Popover>
    </>
  );
}

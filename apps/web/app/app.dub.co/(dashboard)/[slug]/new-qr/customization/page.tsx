"use client";

import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { StaticImageData } from "next/image";
import QRCodeStyling, {
  CornerDotType,
  CornerSquareType,
  Options,
} from "qr-code-styling";
import { DotType } from "qr-code-styling/lib/types";
import { useEffect, useRef, useState } from "react";
import { EQRType } from "../../../../(public)/landing/constants/get-qr-config.ts";
import { STEPS } from "../constants.ts";
import { FileCardContent } from "../content/components/file-card-content.tsx";
import { usePageContext } from "../page-context.tsx";
import { ColorsSettings } from "./components/colors-settings.tsx";
import { QRPreview } from "./components/qr-preview.tsx";
import { StylePicker } from "./components/style-picker.tsx";
import {
  BLACK_COLOR,
  TRANSPARENT_COLOR,
  WHITE_COLOR,
} from "./constants/colors.ts";
import { FRAMES } from "./constants/frames.ts";
import { SUGGESTED_LOGOS } from "./constants/logos.ts";
import {
  BORDER_STYLES,
  CENTER_STYLES,
  DOTS_STYLES,
} from "./constants/styles.ts";
import { convertSvgUrlToBase64 } from "./utils.ts";

export default function NewQRCustomization() {
  const { setTitle, setCurrentStep } = usePageContext();
  const ref = useRef<HTMLDivElement>(null);
  const { isMobile } = useMediaQuery();

  const [options, setOptions] = useState<Options>({
    width: 300,
    height: 300,
    type: "svg",
    data: "https://www.getqr.com/",
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    dotsOptions: {
      type: "dots",
      color: "text-neutral",
    },
    backgroundOptions: {
      color: WHITE_COLOR.toUpperCase(),
    },
    cornersSquareOptions: {
      type: "square",
      color: BLACK_COLOR,
    },
    cornersDotOptions: {
      type: "square",
      color: BLACK_COLOR,
    },
    imageOptions: {
      imageSize: 0.4,
      hideBackgroundDots: true,
      crossOrigin: "anonymous",
    },
  });
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [selectedSuggestedLogo, setSelectedSuggestedLogo] =
    useState<string>("none");
  const [selectedSuggestedFrame, setSelectedSuggestedFrame] =
    useState<string>("none");
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  useEffect(() => {
    setTitle("QR Design");
    setCurrentStep(STEPS.customization.step);

    const qrCodeStyling = new QRCodeStyling(options);
    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (ref.current && qrCode) {
      qrCode.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (!qrCode) return;
    qrCode.update(options);

    if (selectedSuggestedFrame !== "none") {
      const extensionFn = FRAMES[selectedSuggestedFrame];
      if (extensionFn) qrCode.applyExtension(extensionFn);
    }
  }, [selectedSuggestedFrame, options, qrCode]);

  const onBorderStyleChange = (newType: CornerSquareType) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      cornersSquareOptions: {
        ...prevOptions.cornersSquareOptions,
        type: newType,
      },
    }));
  };

  const onCenterStyleChange = (newType: CornerDotType) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      cornersDotOptions: {
        ...prevOptions.cornersDotOptions,
        type: newType,
      },
    }));
  };

  const onBorderColorChange = (color: string) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      dotsOptions: { ...prevOptions.dotsOptions, color },
      cornersSquareOptions: { ...prevOptions.cornersSquareOptions, color },
      cornersDotOptions: { ...prevOptions.cornersDotOptions, color },
    }));
  };

  const onDotsStyleChange = (newType: DotType) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      dotsOptions: {
        ...prevOptions.dotsOptions,
        type: newType,
      },
    }));
  };

  const onBackgroundColorChange = (color: string) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      backgroundOptions: { color },
    }));
  };

  const onTransparentBackgroundToggle = (checked: boolean) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      backgroundOptions: { color: checked ? TRANSPARENT_COLOR : WHITE_COLOR },
    }));
  };

  const onSuggestedLogoSelect = async (logoType: string, logoUrl?: string) => {
    if (selectedSuggestedLogo === logoType) return;

    setSelectedSuggestedLogo(logoType);
    setUploadedLogo(null);

    if (!logoUrl || logoType === "none") {
      setOptions((prevOptions) => ({
        ...prevOptions,
        image: undefined,
      }));
      return;
    }

    const base64 = await convertSvgUrlToBase64(logoUrl);
    setOptions((prevOptions) => ({
      ...prevOptions,
      image: base64,
      imageOptions: {
        ...prevOptions.imageOptions,
        crossOrigin: "anonymous",
      },
    }));
  };

  const onSuggestedFrameSelect = (frameId: string) => {
    setSelectedSuggestedFrame(frameId);

    if (!qrCode) return;

    qrCode.update(options);

    const selected = FRAMES.find((f) => f.type === frameId);
    if (selected?.extension) {
      qrCode.applyExtension(selected.extension);
    } else {
      qrCode.deleteExtension();
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center justify-between gap-14 pb-4 sm:max-w-[800px] sm:items-start md:max-w-[914px] md:flex-row-reverse",
          {
            "pb-[84px]": isMobile,
          },
        )}
      >
        {!isMobile && (
          <div className="hidden flex-col gap-4 self-start sm:sticky sm:flex md:top-[102px]">
            {qrCode && <QRPreview qrCode={qrCode} />}

            <Button
              variant="primary"
              className="bg-secondary hover:bg-secondary/90 h-[44px] w-[208px] border-none text-base text-white ring-0 ring-offset-0 hover:ring-0"
              text="Create"
            />
          </div>
        )}

        <div className="text-neutral border-border-100 flex flex-col gap-6 rounded-lg border px-4 py-4 md:px-6 xl:max-w-[656px]">
          <div className="border-b-border-400 flex flex-col items-start gap-5 border-b-2 pb-6">
            <h2 className="text-lg font-semibold">Shapes & Forms</h2>
            <ColorsSettings
              options={options}
              onBorderColorChange={onBorderColorChange}
              onBackgroundColorChange={onBackgroundColorChange}
              onTransparentBackgroundToggle={onTransparentBackgroundToggle}
              isMobile={isMobile}
            />
            <StylePicker
              label="Border Style"
              styleOptions={BORDER_STYLES}
              selectedStyle={options.cornersSquareOptions?.type ?? "square"}
              onSelect={(type: string) => {
                onBorderStyleChange(type as CornerSquareType);
              }}
              optionsWrapperClassName="gap-2"
              iconSize={30}
              styleButtonClassName={"p-3.5"}
            />
            <StylePicker
              label="Center Style"
              styleOptions={CENTER_STYLES}
              selectedStyle={options.cornersDotOptions?.type ?? "square"}
              onSelect={(type: string) =>
                onCenterStyleChange(type as CornerDotType)
              }
              optionsWrapperClassName="gap-2"
              iconSize={30}
              styleButtonClassName={"p-3.5"}
            />
          </div>

          <div className="border-b-border-400 flex flex-col items-start gap-5 border-b-2 pb-6">
            <StylePicker
              label="Frames"
              styleOptions={FRAMES}
              selectedStyle={selectedSuggestedFrame}
              onSelect={(type: string) => onSuggestedFrameSelect(type)}
              stylePickerWrapperClassName="gap-5"
              optionsWrapperClassName="gap-2"
            />
            <StylePicker
              label="QR code style"
              styleOptions={DOTS_STYLES}
              selectedStyle={options.dotsOptions?.type ?? "square"}
              onSelect={(type: string) => onDotsStyleChange(type as DotType)}
              optionsWrapperClassName="gap-2"
            />
          </div>

          <div className="flex flex-col items-start gap-5">
            <h2 className="text-lg font-semibold">Logos</h2>
            <FileCardContent
              qrType={EQRType.IMAGE}
              files={uploadedLogo ? [uploadedLogo] : []}
              setFiles={(files: File[] | ((prev: File[]) => File[])) => {
                const incoming: File[] =
                  typeof files === "function" ? files([]) : files;

                const file = incoming[incoming.length - 1] || null;

                setSelectedSuggestedLogo("none");

                setTimeout(() => {
                  setUploadedLogo(file);

                  if (!file) {
                    setOptions((prevOptions) => ({
                      ...prevOptions,
                      image: undefined,
                    }));
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result as string;
                    setOptions((prevOptions) => ({
                      ...prevOptions,
                      image: base64,
                      imageOptions: {
                        imageSize: 0.4,
                        crossOrigin: "anonymous",
                      },
                    }));
                  };
                  reader.readAsDataURL(file);
                }, 150);

                return file ? [file] : [];
              }}
              title="Upload your logo"
              multiple={false}
            />
            <StylePicker
              label="Select a logo"
              styleOptions={SUGGESTED_LOGOS}
              selectedStyle={selectedSuggestedLogo}
              onSelect={(type: string, icon?: StaticImageData) =>
                onSuggestedLogoSelect(type, icon?.src)
              }
            />
          </div>
        </div>
      </div>

      {isMobile && (
        <>
          <div className="border-t-border-200 fixed bottom-0 left-0 z-50 flex w-full flex-row items-center gap-4 border-t bg-white px-4 py-3 shadow-lg">
            <Button
              variant="secondary"
              className="text-neutral border-border-300 w-full text-base"
              text="Preview"
              onClick={() => setShowPreviewModal(true)}
            />
            <Button
              variant="primary"
              className="bg-secondary hover:bg-secondary/90 w-full border-none text-base text-white ring-0 ring-offset-0 hover:ring-0"
              text="Create"
              onClick={() => {
                // @TODO: add create logic
              }}
            />
          </div>

          <Modal
            showModal={showPreviewModal}
            setShowModal={setShowPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            preventDefaultClose
            className="flex flex-col items-center justify-center px-6 pb-6"
          >
            {qrCode && <QRPreview qrCode={qrCode} />}
          </Modal>
        </>
      )}
    </>
  );
}

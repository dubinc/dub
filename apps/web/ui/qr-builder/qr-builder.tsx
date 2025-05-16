import { QRBuilderData } from "@/ui/modals/qr-builder";
import { QRCodeDemoPlaceholder } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-placeholder.tsx";
import { QRCodeDemo } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo.tsx";
import Stepper from "@/ui/qr-builder/components/stepper.tsx";
import { qrTypeDataHandlers } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas.tsx";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { QrTabsCustomization } from "@/ui/qr-builder/qr-tabs-customization.tsx";
import { QrTabsStepTitle } from "@/ui/qr-builder/qr-tabs-step-title.tsx";
import { QrTypeSelection } from "@/ui/qr-builder/qr-type-selection.tsx";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { ArrowTurnLeft, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Button, Flex } from "@radix-ui/themes";
import { FC, forwardRef, Ref, useCallback, useState } from "react";
import {
  EQRType,
  LINKED_QR_TYPES,
  QR_TYPES,
} from "./constants/get-qr-config.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";

interface IQRBuilderProps {
  props?: ResponseQrCode;
  homepageDemo?: boolean;
  handleSaveQR?: (data: QRBuilderData) => void;
  isProcessing?: boolean;
  isEdit?: boolean;
}

export const QrBuilder: FC<IQRBuilderProps & { ref?: Ref<HTMLDivElement> }> =
  forwardRef(
    ({ props, homepageDemo, handleSaveQR, isProcessing, isEdit }, ref) => {
      const { isMobile } = useMediaQuery();
      const [step, setStep] = useState<number>(1);
      const [inputValues, setInputValues] = useState<Record<string, string>>(
        {},
      );
      const [isHiddenNetwork, setIsHiddenNetwork] = useState(false);
      const [inputErrors, setInputErrors] = useState<Record<string, string>>(
        {},
      );
      const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
        useState<string>("Frame");

      const {
        options,
        qrCode,
        uploadedLogo,
        selectedSuggestedLogo,
        selectedSuggestedFrame,
        handlers,
        data,
        setData,
        isQrDisabled,
        selectedQRType,
        setSelectedQRType,
        initialInputValues,
      } = useQrCustomization(props);
      console.log("selectedQRType", selectedQRType);
      console.log(
        "[useQrCustomization] initialInputValues",
        initialInputValues,
      );
      console.log("[useQrCustomization] props", props);
      const filteredQrTypes = QR_TYPES.filter(
        (qrType) =>
          !LINKED_QR_TYPES.includes(qrType.id) || qrType.id === EQRType.WEBSITE,
      );

      const onSaveClick = () =>
        handleSaveQR?.({
          styles: options,
          frameOptions: {
            id: selectedSuggestedFrame,
          },
          qrType: setSelectedQRType,
        });

      const handleNextStep = () => {
        setStep((prev) => Math.min(prev + 1, 3));
      };

      const handleSelectQRType = (type: EQRType) => {
        console.log("type", type);
        setSelectedQRType(type);
        handleNextStep();
      };

      const handleContent = useCallback(
        ({
          inputValues,
          isHiddenNetwork,
          qrType,
        }: {
          inputValues: Record<string, string>;
          files: File[];
          isHiddenNetwork: boolean;
          qrType: EQRType;
        }) => {
          // QR name is not needed for QR code generation
          const { qrName, ...filteredInputValues } = inputValues;
          setData(
            qrTypeDataHandlers[qrType](filteredInputValues, isHiddenNetwork),
          );
        },
        [setData],
      );

      return (
        <div
          className={cn(
            "border-border-500 mx-auto h-full w-full rounded-lg border bg-white transition-[height] duration-[300ms]",
          )}
        >
          <Flex
            direction="row"
            align="center"
            justify="between"
            className="px-6 py-3"
          >
            <Stepper
              currentStep={step}
              steps={[
                { number: 1, label: "Choose QR Type" },
                { number: 2, label: "Complete Content" },
                { number: 3, label: "Customize QR" },
              ]}
            />

            {step !== 1 && (
              <Flex gap="2">
                <Button
                  size="3"
                  variant="outline"
                  color="blue"
                  className="flex min-h-10 self-center"
                  disabled={step === 1}
                  onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="3"
                  color="blue"
                  disabled={
                    step === 2 &&
                    (isQrDisabled ||
                      Object.values(inputErrors).some((error) => error !== ""))
                  }
                  onClick={() => setStep((prev) => Math.min(prev + 1, 3))}
                >
                  Continue
                </Button>
              </Flex>
            )}
          </Flex>

          <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-6 overflow-x-auto border-t p-6">
            <QrTabsStepTitle title={"Choose QR Code Type"} />

            <Flex direction="row" gap="6">
              {step === 1 && (
                <Flex gap="4" direction="column" align="start" justify="start">
                  <QrTypeSelection
                    qrTypesList={filteredQrTypes}
                    qrTypeActiveTab={selectedQRType}
                    onSelect={handleSelectQRType}
                  />
                </Flex>
              )}

              {step === 2 && (
                <Flex
                  gap="4"
                  direction="column"
                  align="start"
                  justify="start"
                  className="w-full"
                >
                  <QRCodeContentBuilder
                    qrType={selectedQRType}
                    handleContent={handleContent}
                    inputValues={inputValues}
                    setInputValues={setInputValues}
                    isHiddenNetwork={isHiddenNetwork}
                    setIsHiddenNetwork={setIsHiddenNetwork}
                    inputErrors={inputErrors}
                    setInputErrors={setInputErrors}
                    minimalFlow
                    initialInputValues={initialInputValues}
                  />
                </Flex>
              )}

              {step === 3 && (
                <Flex
                  gap="4"
                  direction="column"
                  align="start"
                  justify="start"
                  className="w-full"
                >
                  <QrTabsCustomization
                    styleOptionActiveTab={styleOptionActiveTab}
                    setStyleOptionActiveActiveTab={
                      setStyleOptionActiveActiveTab
                    }
                    selectedSuggestedFrame={selectedSuggestedFrame}
                    selectedSuggestedLogo={selectedSuggestedLogo}
                    uploadedLogo={uploadedLogo}
                    isQrDisabled={isQrDisabled}
                    isMobile={isMobile}
                    options={options}
                    handlers={handlers}
                  />
                </Flex>
              )}

              <div className="bg-background relative flex h-auto shrink-0 basis-2/5 items-start justify-center overflow-y-auto rounded-lg p-6">
                {step !== 3 && (
                  <div className="relative inline-block">
                    {step === 1 && !selectedQRType ? (
                      <QRCodeDemoPlaceholder />
                    ) : (
                      <QRCodeDemo websiteURL={data} />
                    )}
                    <div className="absolute bottom-0 left-0 h-[136px] w-full bg-gradient-to-b from-white/0 via-white/40 to-white"></div>
                  </div>
                )}

                {step === 3 && (
                  <div className="center sticky top-0 flex h-fit flex-col gap-6">
                    <QRCanvas
                      width={isMobile ? 200 : 300}
                      height={isMobile ? 200 : 300}
                      qrCode={qrCode}
                    />
                  </div>
                )}
              </div>
            </Flex>
            {/*{isMobile ? (*/}
            {/*  <QrConfigTypeTabsMobile*/}
            {/*    options={options}*/}
            {/*    qrCode={qrCode}*/}
            {/*    uploadedLogo={uploadedLogo}*/}
            {/*    selectedSuggestedLogo={selectedSuggestedLogo}*/}
            {/*    selectedSuggestedFrame={selectedSuggestedFrame}*/}
            {/*    handlers={handlers}*/}
            {/*    setData={setData}*/}
            {/*    isQrDisabled={isQrDisabled}*/}
            {/*    qrTypes={filteredQrTypes}*/}
            {/*    homepageDemo={homepageDemo}*/}
            {/*    qrTypeActiveTab={qrTypeActiveTab}*/}
            {/*    setQRTypeActiveTab={setQRTypeActiveTab}*/}
            {/*    initialInputValues={initialInputValues}*/}
            {/*    onRegistrationClick={onSaveClick}*/}
            {/*  />*/}
            {/*) : (*/}
            {/*  <QrTypeTabs*/}
            {/*    options={options}*/}
            {/*    qrCode={qrCode}*/}
            {/*    uploadedLogo={uploadedLogo}*/}
            {/*    selectedSuggestedLogo={selectedSuggestedLogo}*/}
            {/*    selectedSuggestedFrame={selectedSuggestedFrame}*/}
            {/*    handlers={handlers}*/}
            {/*    setData={setData}*/}
            {/*    isQrDisabled={isQrDisabled}*/}
            {/*    nonFileQrTypes={filteredQrTypes}*/}
            {/*    homepageDemo={homepageDemo}*/}
            {/*    qrTypeActiveTab={qrTypeActiveTab}*/}
            {/*    setQRTypeActiveTab={setQRTypeActiveTab}*/}
            {/*    initialInputValues={initialInputValues}*/}
            {/*    onRegistrationClick={onSaveClick}*/}
            {/*    isMobile={isMobile}*/}
            {/*  />*/}
            {/*)}*/}
          </div>
          {!homepageDemo && (
            <div className="-mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 p-4">
              <Button
                disabled={isProcessing}
                loading={isProcessing}
                text={
                  <span className="flex items-center gap-2">
                    {isEdit ? "Save changes" : "Create QR"}
                    <div className="rounded border border-white/20 p-1">
                      <ArrowTurnLeft className="size-3.5" />
                    </div>
                  </span>
                }
                className="h-8 w-fit pl-2.5 pr-1.5"
                onClick={onSaveClick}
              />
            </div>
          )}
        </div>
      );
    },
  );

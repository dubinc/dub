import { QRBuilderData } from "@/ui/modals/qr-builder";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { QRCodeDemoPlaceholder } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-placeholder.tsx";
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
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import {
  FC,
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  EQRType,
  FILE_QR_TYPES,
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

export const QRBuilderStepsTitles = [
  "Choose QR Code Type",
  "Complete the content",
  "Customize your QR",
];

export const QrBuilder: FC<IQRBuilderProps & { ref?: Ref<HTMLDivElement> }> =
  forwardRef(
    ({ props, homepageDemo, handleSaveQR, isProcessing, isEdit }, ref) => {
      const { isMobile } = useMediaQuery();
      const [step, setStep] = useState<number>(1);
      const [inputValues, setInputValues] = useState<Record<string, string>>(
        {},
      );
      const [files, setFiles] = useState<File[]>([]);
      console.log("[QrBuilder] inputValues", inputValues);
      console.log("[QrBuilder] files", files);
      const [isHiddenNetwork, setIsHiddenNetwork] = useState(false);
      const [inputErrors, setInputErrors] = useState<Record<string, string>>(
        {},
      );
      const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
        useState<string>("Frame");
      const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);

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
      console.log("[useQrCustomization] data", data);
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

      const handleHoverQRType = (type: EQRType | null) => {
        setHoveredQRType(type);
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

      const typeStep = step === 1;
      const contentStep = step === 2;
      const customizationStep = step === 3;

      // const currentQRType = typeStep
      //   ? hoveredQRType !== null
      //     ? hoveredQRType
      //     : selectedQRType
      //   : selectedQRType;
      // const qrCodeDemo = QRCodeDemoMap[currentQRType] ?? null;
      // const demoProps = qrCodeDemo?.propsKeys.reduce(
      //   (acc, key) => {
      //     acc[key] = inputValues[key];
      //     return acc;
      //   },
      //   {} as Record<string, string>,
      // );
      const [currentQRType, setCurrentQRType] = useState<EQRType | null>(null);

      useEffect(() => {
        const typeStep = step === 1;
        const newCurrentQRType = typeStep
          ? hoveredQRType !== null
            ? hoveredQRType
            : selectedQRType
          : selectedQRType;

        setCurrentQRType(newCurrentQRType);
        console.log("[QRBuilder] currentQRType updated to:", newCurrentQRType);
      }, [step, hoveredQRType, selectedQRType]);

      const qrCodeDemo = useMemo(() => {
        return currentQRType ? QRCodeDemoMap[currentQRType] : null;
      }, [currentQRType]);

      const demoProps = useMemo(() => {
        if (!qrCodeDemo || !currentQRType) return {};

        if (FILE_QR_TYPES.includes(currentQRType)) {
          return { files };
        }

        return qrCodeDemo.propsKeys.reduce(
          (acc: Record<string, string>, key: string) => {
            acc[key] = inputValues[key];
            return acc;
          },
          {},
        );
      }, [qrCodeDemo, inputValues, files, currentQRType]);

      console.log("[QrBuilder] currentQRType", currentQRType);
      console.log("[QrBuilder] qrCodeDemo", qrCodeDemo);
      console.log("[QrBuilder] demoProps", demoProps);

      return (
        <div
          className={cn(
            "border-border-500 mx-auto h-full w-full rounded-lg border bg-white transition-[height] duration-[300ms]",
          )}
        >
          <Flex
            direction="row"
            align="center"
            justify="start"
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

            {!typeStep && (
              <Flex gap="4" className="pr-8">
                <Button
                  size="3"
                  variant="outline"
                  color="blue"
                  className="flex min-h-10 self-center"
                  disabled={typeStep}
                  onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="submit"
                  size="3"
                  color="blue"
                  className="min-w-60"
                  disabled={
                    contentStep &&
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
            <QrTabsStepTitle title={QRBuilderStepsTitles[step - 1]} />

            <Flex direction="row" gap="6">
              {typeStep && (
                <Flex gap="4" direction="column" align="start" justify="start">
                  <QrTypeSelection
                    qrTypesList={filteredQrTypes}
                    qrTypeActiveTab={selectedQRType}
                    onSelect={handleSelectQRType}
                    onHover={handleHoverQRType}
                  />
                </Flex>
              )}

              {contentStep && (
                <Flex
                  gap="4"
                  direction="column"
                  align="start"
                  justify="start"
                  className="w-full md:max-w-[524px]"
                >
                  <QRCodeContentBuilder
                    qrType={selectedQRType}
                    handleContent={handleContent}
                    inputValues={inputValues}
                    setInputValues={setInputValues}
                    files={files}
                    setFiles={setFiles}
                    isHiddenNetwork={isHiddenNetwork}
                    setIsHiddenNetwork={setIsHiddenNetwork}
                    inputErrors={inputErrors}
                    setInputErrors={setInputErrors}
                    minimalFlow
                  />
                </Flex>
              )}

              {customizationStep && (
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

              <div
                className={cn(
                  "bg-background relative flex h-auto shrink-0 basis-2/5 items-end justify-center rounded-lg p-6",
                  {
                    "items-start overflow-y-auto": customizationStep,
                  },
                )}
              >
                {!customizationStep && (
                  <div className="relative inline-block">
                    {!currentQRType ? (
                      <QRCodeDemoPlaceholder />
                    ) : (
                      <motion.div
                        key={currentQRType}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                          exit: { opacity: 0, y: 20 },
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        {qrCodeDemo && <qrCodeDemo.Component {...demoProps} />}
                      </motion.div>
                    )}
                    <div className="absolute left-1/2 top-[249.72px] h-[150.28px] w-[400px] -translate-x-1/2 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_12.22%,_#FFFFFF_73.25%)]"></div>
                  </div>
                )}

                {customizationStep && (
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

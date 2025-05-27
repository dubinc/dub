import { QRBuilderData } from "@/ui/modals/qr-builder";
import { QrBuilderButtons } from "@/ui/qr-builder/components/qr-builder-buttons.tsx";
import { QRCodeDemoMap } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-map.ts";
import { QRCodeDemoPlaceholder } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-placeholder.tsx";
import Stepper from "@/ui/qr-builder/components/stepper.tsx";
import { qrTypeDataHandlers } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { useIsInViewport } from "@/ui/qr-builder/hooks/use-is-in-viewport.ts";
import { useQRContentForm } from "@/ui/qr-builder/hooks/use-qr-content-form.ts";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas.tsx";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { QrTabsCustomization } from "@/ui/qr-builder/qr-tabs-customization.tsx";
import { QrTabsDownloadButton } from "@/ui/qr-builder/qr-tabs-download-button.tsx";
import { QrTabsStepTitle } from "@/ui/qr-builder/qr-tabs-step-title.tsx";
import { QrTypeSelection } from "@/ui/qr-builder/qr-type-selection.tsx";
import { ResponseQrCode } from "@/ui/qr-code/qr-codes-container.tsx";
import { ArrowTurnLeft, Button as DubButton, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import {
  FC,
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider } from "react-hook-form";
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
      const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
        useState<string>("Frame");
      const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
      const [files, setFiles] = useState<File[]>([]);
      const [typeSelectionError, setTypeSelectionError] = useState<string>("");

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

      const handleNextStep = () => {
        setStep((prev) => Math.min(prev + 1, 3));
      };

      const handleSelectQRType = (type: EQRType) => {
        console.log("type", type);
        setTypeSelectionError("");
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
          inputValues: Record<string, string | File[]>;
          isHiddenNetwork: boolean;
          qrType: EQRType;
        }) => {
          // QR name is not needed for QR code generation
          const { qrName, ...filteredInputValues } = inputValues;
          console.log(inputValues);
          setData(
            qrTypeDataHandlers[qrType]?.(filteredInputValues, isHiddenNetwork),
          );
          setFiles(inputValues.files as File[]);
        },
        [setData],
      );

      const {
        form,
        isHiddenNetwork,
        handleValidationAndContentSubmit,
        handleSetIsHiddenNetwork,
      } = useQRContentForm({
        qrType: selectedQRType,
        minimalFlow: true,
        handleContent,
      });

      const onSaveClick = () => {
        handleSaveQR?.({
          styles: options,
          frameOptions: {
            id: selectedSuggestedFrame,
          },
          qrType: selectedQRType,
          files,
        });
      };

      const typeStep = step === 1;
      const contentStep = step === 2;
      const customizationStep = step === 3;

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

        return qrCodeDemo.propsKeys.reduce(
          (acc: Record<string, string | File[] | undefined>, key: string) => {
            acc[key] = form.getValues()[key];
            return acc;
          },
          {},
        );
      }, [qrCodeDemo, form.getValues(), currentQRType]);

      console.log("[QrBuilder] currentQRType", currentQRType);
      console.log("[QrBuilder] qrCodeDemo", qrCodeDemo);
      console.log("[QrBuilder] demoProps", demoProps);

      const hideDemoPlaceholderOnMobile = isMobile && typeStep;
      const qrBuilderContentWrapperRef = useRef<HTMLDivElement>(null);
      const qrBuilderButtonsWrapperRef = useRef<HTMLDivElement>(null);
      const navigationButtonsInViewport = useIsInViewport(
        qrBuilderButtonsWrapperRef,
        0.6,
        qrBuilderContentWrapperRef,
      );

      const handleStepClick = useCallback(
        (newStep: number) => {
          // Don't allow navigating to step 2 without selecting a QR type
          if (newStep === 2 && !selectedQRType) {
            setTypeSelectionError("Please select a QR code type to continue");
            return;
          }

          // Clear error when selecting a valid step
          setTypeSelectionError("");

          // Don't allow navigating to step 3 without completing content
          if (newStep === 3 && step === 2) {
            // Validate form and only proceed if validation passes
            form.trigger().then((isValid) => {
              if (isValid) {
                // Ensure content is processed
                handleValidationAndContentSubmit();
                setStep(newStep);
              }
            });
            return; // Return early to prevent immediate navigation
          }

          // If we're navigating to step 2, trigger validation to show required fields
          if (newStep === 2) {
            // This will trigger validation to show required fields
            form.trigger();
          }

          setStep(newStep);
        },
        [selectedQRType, handleValidationAndContentSubmit, form, step],
      );

      return (
        <div
          ref={qrBuilderContentWrapperRef}
          className={cn(
            "border-border-500 mx-auto h-full w-full rounded-lg border bg-white transition-[height] duration-[300ms]",
          )}
        >
          <Flex align="center" justify="center" className="px-6 py-3">
            <Stepper
              currentStep={step}
              steps={[
                {
                  number: 1,
                  label: "Choose type",
                },
                { number: 2, label: "Complete Content" },
                { number: 3, label: "Customize QR" },
              ]}
              onStepClick={handleStepClick}
            />
          </Flex>

          <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
            <QrTabsStepTitle title={QRBuilderStepsTitles[step - 1]} />

            <Flex
              direction={{ initial: "column-reverse", md: "row" }}
              gap={{ initial: "4", md: "6" }}
            >
              {typeStep && (
                <Flex
                  gap="4"
                  direction="column"
                  align="start"
                  justify="start"
                  className="w-full"
                >
                  <QrTypeSelection
                    qrTypesList={filteredQrTypes}
                    qrTypeActiveTab={selectedQRType}
                    onSelect={handleSelectQRType}
                    onHover={handleHoverQRType}
                  />
                  {typeSelectionError && (
                    <div className="text-sm font-medium text-red-500">
                      {typeSelectionError}
                    </div>
                  )}
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
                  <FormProvider {...form}>
                    <QRCodeContentBuilder
                      qrType={selectedQRType}
                      isHiddenNetwork={isHiddenNetwork}
                      onHiddenNetworkChange={handleSetIsHiddenNetwork}
                      validateFields={handleValidationAndContentSubmit}
                      minimalFlow
                    />
                    <div ref={qrBuilderButtonsWrapperRef} className="w-full">
                      <QrBuilderButtons
                        step={step}
                        onStepChange={setStep}
                        onSaveClick={onSaveClick}
                        validateFields={handleValidationAndContentSubmit}
                      />
                    </div>
                  </FormProvider>
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
                    homepageDemo={homepageDemo}
                    handlers={handlers}
                  />

                  <div ref={qrBuilderButtonsWrapperRef} className="w-full">
                    <QrBuilderButtons
                      step={step}
                      onStepChange={setStep}
                      onSaveClick={onSaveClick}
                      validateFields={handleValidationAndContentSubmit}
                    />
                  </div>
                </Flex>
              )}

              {!hideDemoPlaceholderOnMobile && (
                <div
                  className={cn(
                    "bg-background relative flex h-auto shrink-0 basis-2/5 items-end justify-center rounded-lg px-6 pb-0 pt-3 md:p-6 [&_svg]:h-[200px] md:[&_svg]:h-full",
                    {
                      "items-start": customizationStep,
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
                          {qrCodeDemo && (
                            <qrCodeDemo.Component {...demoProps} />
                          )}
                        </motion.div>
                      )}
                      <div className="absolute left-1/2 top-[125px] h-[76px] w-[340px] -translate-x-1/2 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_12.22%,_#FFFFFF_73.25%)] md:top-[249.72px] md:h-[126px] md:w-[400px]"></div>
                    </div>
                  )}

                  {customizationStep && (
                    <div className="center sticky top-20 flex flex-col gap-6">
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
                        <div
                          className={cn(
                            "flex justify-center rounded-lg shadow-lg",
                            {
                              "opacity-30": isQrDisabled,
                            },
                          )}
                        >
                          <QRCanvas
                            width={isMobile ? 200 : 300}
                            height={isMobile ? 200 : 300}
                            qrCode={qrCode}
                          />
                        </div>
                      </motion.div>
                      {homepageDemo &&
                        !isMobile &&
                        !navigationButtonsInViewport && (
                          <QrTabsDownloadButton
                            onRegistrationClick={onSaveClick}
                            isQrDisabled={isQrDisabled}
                          />
                        )}
                    </div>
                  )}
                </div>
              )}
            </Flex>
          </div>
          {!homepageDemo && (
            <div className="-mt-2 flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 p-4">
              <DubButton
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

          {isMobile && !navigationButtonsInViewport && !typeStep && (
            <div className="border-border-500 sticky bottom-0 left-0 z-50 w-full border-t bg-white px-6 py-3 shadow-md">
              <QrBuilderButtons
                step={step}
                onStepChange={setStep}
                onSaveClick={onSaveClick}
                validateFields={handleValidationAndContentSubmit}
              />
            </div>
          )}
        </div>
      );
    },
  );

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
import { useMediaQuery } from "@dub/ui";
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
import { getFiles, setFiles } from "./helpers/file-store.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";

interface IQRBuilderProps {
  props?: ResponseQrCode;
  homepageDemo?: boolean;
  handleSaveQR?: (data: QRBuilderData) => Promise<void>;
  isProcessing?: boolean;
  isEdit?: boolean;
  initialStep?: number;
}

export const QRBuilderStepsTitles = [
  "Choose QR Code Type",
  "Complete the content",
  "Customize your QR",
];

export const QrBuilder: FC<IQRBuilderProps & { ref?: Ref<HTMLDivElement> }> =
  forwardRef(
    (
      { props, homepageDemo, handleSaveQR, isProcessing, isEdit, initialStep },
      ref,
    ) => {
      const { isMobile } = useMediaQuery();
      const [step, setStep] = useState<number>(() => {
        if (isProcessing) return 3;
        return initialStep || 1;
      });
      const [styleOptionActiveTab, setStyleOptionActiveActiveTab] =
        useState<string>("Frame");
      const [hoveredQRType, setHoveredQRType] = useState<EQRType | null>(null);
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

      const handleScroll = () => {
        if (isMobile && qrBuilderContentWrapperRef.current) {
          qrBuilderContentWrapperRef.current.style.scrollMargin = "60px";
          qrBuilderContentWrapperRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      };

      const handleNextStep = () => {
        setStep((prev) => Math.min(prev + 1, 3));
        handleScroll();
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
          setFiles(
            (inputValues.filesImage ||
              inputValues.filesPDF ||
              inputValues.filesVideo) as File[],
          );
          handleScroll();
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
        const formValues = form.getValues();
        const qrNameFieldId = `qrName-${selectedQRType}`;

        handleSaveQR?.({
          title: formValues[qrNameFieldId] as string,
          styles: options,
          frameOptions: {
            id: selectedSuggestedFrame,
          },
          qrType: selectedQRType,
          files: getFiles() as File[],
        }).then(() => {
          // setFiles(null);
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
          if (newStep === 2 && !selectedQRType) {
            setTypeSelectionError("Please select a QR code type to continue");
            return;
          }

          setTypeSelectionError("");

          if (newStep === 3 && step === 2) {
            form.trigger().then((isValid) => {
              if (isValid) {
                handleValidationAndContentSubmit();
                setStep(newStep);
              }
            });
            return;
          }

          if (newStep === 2) {
            form.trigger();
          }

          setStep(newStep);
        },
        [selectedQRType, handleValidationAndContentSubmit, form, step],
      );

      const onBackClick = () => {
        handleScroll();
      };

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
                        onBackClick={onBackClick}
                        validateFields={handleValidationAndContentSubmit}
                        isEdit={isEdit}
                        isProcessing={isProcessing}
                        homePageDemo={homepageDemo}
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
                  justify="between"
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
                      onBackClick={onBackClick}
                      validateFields={handleValidationAndContentSubmit}
                      isEdit={isEdit}
                      isProcessing={isProcessing}
                      homePageDemo={homepageDemo}
                    />
                  </div>
                </Flex>
              )}

              {!hideDemoPlaceholderOnMobile && (
                <div
                  className={cn(
                    "bg-background relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg px-6 pb-0 pt-3 md:p-6 [&_svg]:h-[200px] md:[&_svg]:h-full",
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
                      <div className="absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_0%,_rgba(255,255,255,0.1)_30%,_rgba(255,255,255,0.4)_70%,_rgba(255,255,255,0.8)_100%)] backdrop-blur-[1px]"></div>
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

          {isMobile && !navigationButtonsInViewport && !typeStep && (
            <div className="border-border-500 sticky bottom-0 left-0 z-50 w-full border-t bg-white px-6 py-3 shadow-md">
              <QrBuilderButtons
                step={step}
                onStepChange={setStep}
                onSaveClick={onSaveClick}
                onBackClick={onBackClick}
                validateFields={handleValidationAndContentSubmit}
                isEdit={isEdit}
                isProcessing={isProcessing}
                homePageDemo={homepageDemo}
              />
            </div>
          )}
        </div>
      );
    },
  );

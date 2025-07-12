import useUser from "@/lib/swr/use-user.ts";
import { QrBuilderButtons } from "@/ui/qr-builder/components/qr-builder-buttons.tsx";
import { QRCodeDemoPlaceholder } from "@/ui/qr-builder/components/qr-code-demos/qr-code-demo-placeholder.tsx";
import Stepper from "@/ui/qr-builder/components/stepper.tsx";
import { qrTypeDataHandlers } from "@/ui/qr-builder/helpers/qr-type-data-handlers.ts";
import { useIsInViewport } from "@/ui/qr-builder/hooks/use-is-in-viewport.ts";
import { useQRBuilderSteps } from "@/ui/qr-builder/hooks/use-qr-builder-steps.ts";
import { useQRContentForm } from "@/ui/qr-builder/hooks/use-qr-content-form.ts";
import { useQRTypeDemo } from "@/ui/qr-builder/hooks/use-qr-type-demo.ts";
import { QRCanvas } from "@/ui/qr-builder/qr-canvas.tsx";
import { QRCodeContentBuilder } from "@/ui/qr-builder/qr-code-content-builder.tsx";
import { QrTabsCustomization } from "@/ui/qr-builder/qr-tabs-customization.tsx";
import { QrTabsDownloadButton } from "@/ui/qr-builder/qr-tabs-download-button.tsx";
import { QrTabsStepTitle } from "@/ui/qr-builder/qr-tabs-step-title.tsx";
import { QrTypeSelection } from "@/ui/qr-builder/qr-type-selection.tsx";
import { QRBuilderData, QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Flex } from "@radix-ui/themes";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { motion } from "framer-motion";
import { FC, forwardRef, Ref, useCallback, useRef, useState } from "react";
import { FormProvider } from "react-hook-form";
import {
  EQRType,
  LINKED_QR_TYPES,
  QR_TYPES,
} from "./constants/get-qr-config.ts";
import { getFiles, setFiles } from "./helpers/file-store.ts";
import { useQrCustomization } from "./hooks/use-qr-customization.ts";

interface IQRBuilderProps {
  props?: QrStorageData;
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
      const { user } = useUser();

      // ===== PROPS & CONSTANTS =====
      const { isMobile } = useMediaQuery();

      const filteredQrTypes = QR_TYPES.filter(
        (qrType) =>
          !LINKED_QR_TYPES.includes(qrType.id) || qrType.id === EQRType.WEBSITE,
      );

      // ===== HOOKS & STATE =====
      const {
        options,
        qrCode,
        uploadedLogo,
        selectedSuggestedLogo,
        selectedSuggestedFrame,
        frameColor,
        frameText,
        frameTextColor,
        handlers,
        setData,
        isQrDisabled,
        selectedQRType,
        setSelectedQRType,
        parsedInputValues,
      } = useQrCustomization(props, homepageDemo);

      // ===== REFS =====
      const qrBuilderContentWrapperRef = useRef<HTMLDivElement>(null);
      const qrBuilderButtonsWrapperRef = useRef<HTMLDivElement>(null);

      const navigationButtonsInViewport = useIsInViewport(
        qrBuilderButtonsWrapperRef,
        0.6,
      );

      // ===== EVENT HANDLERS =====
      const handleScroll = () => {
        if (isMobile && qrBuilderContentWrapperRef.current) {
          qrBuilderContentWrapperRef.current.style.scrollMargin = "60px";
          qrBuilderContentWrapperRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
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

          setData(
            qrType === EQRType.WIFI
              ? qrTypeDataHandlers[qrType]?.(
                  filteredInputValues as Record<string, string>,
                  isHiddenNetwork,
                )
              : qrTypeDataHandlers[qrType]?.(
                  filteredInputValues as Record<string, string>,
                ),
          );

          let files: File[] | null = null;
          switch (qrType) {
            case EQRType.PDF:
              files = (inputValues.filesPDF as File[]) || null;
              break;
            case EQRType.IMAGE:
              files = (inputValues.filesImage as File[]) || null;
              break;
            case EQRType.VIDEO:
              files = (inputValues.filesVideo as File[]) || null;
              break;
          }

          setFiles(files);
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
        initialInputValues: parsedInputValues || {},
        initialIsHiddenNetwork: parsedInputValues?.isHiddenNetwork === "true",
        qrTitle: props?.title || undefined,
        handleContent,
      });

      const {
        step,
        isTypeStep,
        isContentStep,
        isCustomizationStep,
        typeSelectionError,
        handleNextStep,
        handleChangeStep,
      } = useQRBuilderSteps({
        selectedQRType,
        form,
        handleValidationAndContentSubmit,
        isProcessing,
        initialStep,
      });

      const { currentQRType, qrCodeDemo, demoProps, handleHoverQRType } =
        useQRTypeDemo({
          step,
          selectedQRType,
          form,
        });

      const [styleOptionActiveTab, setStyleOptionActiveTab] = useState<
        "Frame" | "Style" | "Shape" | "Logo"
      >("Frame");

      // ===== COMPUTED VALUES =====
      const hideDemoPlaceholderOnMobile = isMobile && isTypeStep;

      // ===== EVENT HANDLERS =====
      const onSaveClick = () => {
        const formValues = form.getValues();
        const qrNameFieldId = `qrName-${selectedQRType}`;
        const title =
          (formValues[qrNameFieldId] as string) || props?.title || "QR Code";

        const files = getFiles() as File[];

        handleSaveQR?.({
          title,
          styles: options,
          frameOptions: {
            id: selectedSuggestedFrame,
            color: frameColor,
            text: frameText,
            textColor: frameTextColor,
          },
          qrType: selectedQRType,
          files: files || [],
        }).then(() => {
          // setFiles(null);
        });
      };

      const handleSelectQRType = (type: EQRType) => {
        trackClientEvents({
          event: EAnalyticEvents.PAGE_CLICKED,
          params: {
            page_name: homepageDemo ? "landing" : "profile",
            content_value: type,
            content_group: "choose_type",
            ...(user ? { email: user?.email } : {}),
          },
          ...(user ? { sessionId: user?.id } : {}),
        });

        setSelectedQRType(type);
        handleNextStep();
      };

      const handleBack = () => {
        handleChangeStep(Math.max(step - 1, 1));
        handleScroll();
      };

      const handleContinue = async () => {
        if (isCustomizationStep) {
          trackClientEvents({
            event: EAnalyticEvents.PAGE_CLICKED,
            params: {
              page_name: homepageDemo ? "landing" : "profile",
              content_value: homepageDemo
                ? "download"
                : isEdit
                  ? "save"
                  : "create",
              content_group: "complete_content",
              ...(user ? { email: user?.email } : {}),
            },
            ...(user ? { sessionId: user?.id } : {}),
          });

          onSaveClick();
          return;
        }

        const isValid = await handleValidationAndContentSubmit();
        if (isValid) {
          trackClientEvents({
            event: EAnalyticEvents.PAGE_CLICKED,
            params: {
              page_name: homepageDemo ? "landing" : "profile",
              content_value: "continue",
              content_group: "complete_content",
              ...(user ? { email: user?.email } : {}),
            },
            ...(user ? { sessionId: user?.id } : {}),
          });

          handleNextStep();
          handleScroll();
        }
      };

      return (
        <div
          ref={qrBuilderContentWrapperRef}
          className={cn(
            "border-border-500 mx-auto flex h-full w-full flex-col justify-between rounded-lg border bg-white",
            {
              "pointer-events-none": isProcessing,
            },
          )}
        >
          <div>
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
                onStepClick={handleChangeStep}
              />
            </Flex>

            <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
              <QrTabsStepTitle title={QRBuilderStepsTitles[step - 1]} />

              <Flex
                direction={{ initial: "column-reverse", md: "row" }}
                gap={{ initial: "4", md: "6" }}
              >
                <div className="flex w-full flex-col justify-between gap-4">
                  <div className="flex h-full w-full flex-col items-start justify-between gap-4">
                    {isTypeStep && (
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

                    {isContentStep && (
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
                            homePageDemo
                          />
                        </FormProvider>
                      </Flex>
                    )}

                    {isCustomizationStep && (
                      <Flex
                        gap="4"
                        direction="column"
                        align="start"
                        justify="between"
                        className="w-full"
                      >
                        <QrTabsCustomization
                          styleOptionActiveTab={styleOptionActiveTab}
                          setStyleOptionActiveTab={setStyleOptionActiveTab}
                          selectedSuggestedFrame={selectedSuggestedFrame}
                          selectedSuggestedLogo={selectedSuggestedLogo}
                          uploadedLogo={uploadedLogo}
                          isQrDisabled={isQrDisabled}
                          isMobile={isMobile}
                          options={options}
                          homepageDemo={homepageDemo}
                          handlers={handlers}
                          frameOptions={{
                            id: selectedSuggestedFrame,
                            color: frameColor,
                            textColor: frameTextColor,
                            text: frameText,
                          }}
                        />
                      </Flex>
                    )}

                    {!isMobile && !isTypeStep && (
                      <div className="w-full" ref={qrBuilderButtonsWrapperRef}>
                        <QrBuilderButtons
                          step={step}
                          onBack={handleBack}
                          onContinue={handleContinue}
                          isEdit={isEdit}
                          isProcessing={isProcessing}
                          homePageDemo={homepageDemo}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    "bg-background relative flex h-auto shrink-0 basis-2/5 items-start justify-center rounded-lg px-6 pb-0 pt-3 md:p-6 [&_svg]:h-[200px] md:[&_svg]:h-full",
                    {
                      "items-start pb-3": isCustomizationStep,
                      hidden: hideDemoPlaceholderOnMobile,
                    },
                  )}
                >
                  {!isCustomizationStep && (
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
                          <div className="absolute inset-x-0 bottom-0 h-1/5 bg-[linear-gradient(180deg,_rgba(255,255,255,0)_0%,_rgba(255,255,255,0.1)_30%,_rgba(255,255,255,0.4)_70%,_rgba(255,255,255,0.8)_100%)] backdrop-blur-[1px]"></div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {isCustomizationStep && (
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
                            width={isMobile ? 200 : 352}
                            height={isMobile ? 200 : 352}
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
              </Flex>
            </div>
          </div>

          {!isTypeStep && isMobile && (
            <div className="border-border-500 sticky bottom-0 z-10 mt-auto w-full border-t bg-white px-6 py-3">
              <QrBuilderButtons
                step={step}
                onBack={handleBack}
                onContinue={handleContinue}
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

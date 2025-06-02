"use client";

import {
  CardPreferredFlow,
  Payment,
  PaymentFlow,
  Primer,
  PrimerCheckout,
} from "@primer-io/checkout-web";

import { v4 as uuidV4 } from "uuid";
import { checkoutFormStyles, declineReasons } from "./constant";
import {
  DeclineReasonKeys,
  ICheckoutFormError,
  ICheckoutFormSuccess,
} from "./interface";

import { FC, ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@dub/ui";
import {
  getPaymentPlanPrice,
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/config";
import {
  getPrimerPaymentInfo,
  getSystemPaymentError,
  updatePrimerClientSession,
} from "./mock-server";
import "./style/form-style.css";

interface ICheckoutFormComponentProps {
  locale: string;
  theme?: "light" | "dark";
  user: ICustomerBody | null;
  submitBtn?: { text: string; icon?: ReactNode } | null;
  nationParam?: { label: string; placeholder?: string; error?: string } | null;
  paymentPlan?: TPaymentPlan;
  handleCheckoutError?: (error: ICheckoutFormError) => void;
  handleCheckoutSuccess: (data: ICheckoutFormSuccess) => void;
  onPaymentMethodUnselected?: () => void;
  onPaymentMethodSelected?: (paymentMethodType: string) => void;
  onPaymentMethodAction?: () => void;
  onCheckoutFormFinally?: () => void;
  handleOpenCardDetailsForm?: () => void;
  onBeforePaymentCreate?: (paymentMethodType: string) => void;
  onPaymentAttempt?: () => void;
  cardPreferredFlow?: CardPreferredFlow;
}

const CheckoutFormComponent: FC<ICheckoutFormComponentProps> = (props) => {
  const {
    locale,
    theme = "light",
    user,
    submitBtn,
    nationParam,
    paymentPlan = "QUARTERLY",
    handleCheckoutSuccess,
    handleCheckoutError,
    onPaymentMethodUnselected,
    onPaymentMethodSelected,
    onPaymentMethodAction,
    onCheckoutFormFinally,
    handleOpenCardDetailsForm,
    onBeforePaymentCreate,
    onPaymentAttempt,
    cardPreferredFlow = "DEDICATED_SCENE",
  } = props;

  const checkoutTriggeredRef = useRef(false);
  const nationIdRef = useRef<string>("");

  const [checkoutInstance, setCheckoutInstance] =
    useState<PrimerCheckout | null>(null);
  const [nationIdError, setNationIdError] = useState<boolean>(false);
  const [isSubmitButton, setIsSubmitButton] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string>("");

  const [error, setError] = useState<ICheckoutFormError>({
    message: "",
    code: "",
    isActive: false,
    paymentId: "",
  });
  const handleError = (error: ICheckoutFormError) => {
    setIsLoading(false);

    setError(error);

    if (error?.code || error?.message) {
      handleCheckoutError?.(error);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    if (!nationIdRef?.current && nationParam) {
      setIsLoading(false);
      return setNationIdError(true);
    }

    checkoutInstance?.submit();
  };

  const handleSuccess = (data: {
    currencyCode: string;
    payment: Payment;
    paymentType: string;
    paymentMethodType: string;
    paymentProcessor: string;
    first6Digits?: string;
  }) => {
    handleCheckoutSuccess({
      payment: data.payment,
      paymentType: data.paymentType,
      paymentMethodType: data.paymentMethodType,
      paymentProcessor: data.paymentProcessor,
      currencyCode: data.currencyCode,
      nationalDocumentId: nationIdRef.current || undefined,
      first6Digits: data.first6Digits?.toString() || "",
    });
    setIsLoading(false);
  };

  const clientToken = user?.paymentInfo?.clientToken || "";
  const handleCheckoutForm = async () => {
    if (!clientToken) {
      console.error("No client token provided");
      return;
    }

    try {
      const instance = await Primer.showUniversalCheckout(clientToken, {
        container: "#checkout-container",
        locale,
        vault: { visible: false },
        submitButton: {
          useBuiltInButton: false,
          onLoading: () => setIsLoading(true),
          onVisible: (isVisible: boolean) => {
            if (isVisible && handleOpenCardDetailsForm) {
              handleOpenCardDetailsForm();
            }

            setIsLoading(false);
            setIsSubmitButton(isVisible);
          },
        },

        card: { preferredFlow: cardPreferredFlow },
        googlePay: { captureBillingAddress: true, buttonSizeMode: "fill" },
        paypal: { paymentFlow: PaymentFlow.PREFER_VAULT },
        applePay: {
          buttonType: "buy",
          buttonStyle: theme === "light" ? "black" : "white",
        },
        style: { ...checkoutFormStyles, focusCheckoutOnInit: false },

        onPaymentCreationStart() {
          onPaymentAttempt?.();
        },
        async onBeforePaymentCreate({ paymentMethodType }, handler) {
          const errorMessage: ICheckoutFormError = {
            code: "",
            message: "",
            isActive: true,
          };

          const createUserObject = (currencyForPay: string): ICustomerBody => ({
            id: user!.id,
            email: user!.email,
            paymentInfo: {
              clientToken: user?.paymentInfo?.clientToken!,
              paymentMethodType: paymentMethodType,
            },
            currency: {
              currencyCard: user?.currency?.currencyCard,
              currencyPaypal: user?.currency?.currencyPaypal,
              currencyWallet: user?.currency?.currencyWallet,
              countryCode: user?.currency?.countryCode,
              currencyForPay: currencyForPay,
            },
          });

          try {
            if (paymentMethodType) {
              onBeforePaymentCreate?.(paymentMethodType!);
            }

            if (paymentMethodType?.includes("CARD")) {
              const cardUser = createUserObject(
                user?.currency?.currencyCard || "USD",
              );
              const { priceForPay } = getPaymentPlanPrice({
                paymentPlan,
                user: cardUser,
              });
              const { priceForPay: minPriceForPay } = getPaymentPlanPrice({
                paymentPlan: "QUARTERLY",
                user: cardUser,
              });

              await updatePrimerClientSession({
                clientToken,
                currencyCode: user?.currency?.currencyCard || "USD",
                amount: priceForPay - minPriceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay - minPriceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "US",
                },
              });
            }

            if (
              paymentMethodType?.includes("PAYPAL") &&
              (user?.currency?.currencyCard || "USD") !==
                (user?.currency?.currencyPaypal || "USD")
            ) {
              const paypalUser = createUserObject(
                user?.currency?.currencyPaypal || "USD",
              );
              const { priceForPay } = getPaymentPlanPrice({
                paymentPlan,
                user: paypalUser,
              });
              const { priceForPay: minPriceForPay } = getPaymentPlanPrice({
                paymentPlan: "QUARTERLY",
                user: paypalUser,
              });

              await updatePrimerClientSession({
                clientToken,
                currencyCode: user?.currency?.currencyPaypal || "USD",
                amount: priceForPay - minPriceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay - minPriceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "US",
                },
              });
            }

            if (
              (paymentMethodType?.includes("GOOGLE") ||
                paymentMethodType?.includes("APPLE")) &&
              (user?.currency?.currencyCard || "USD") !==
                (user?.currency?.currencyWallet || "USD")
            ) {
              const walletUser = createUserObject(
                user?.currency?.currencyWallet || "USD",
              );
              const { priceForPay } = getPaymentPlanPrice({
                paymentPlan,
                user: walletUser,
              });
              const { priceForPay: minPriceForPay } = getPaymentPlanPrice({
                paymentPlan: "QUARTERLY",
                user: walletUser,
              });

              await updatePrimerClientSession({
                clientToken,
                currencyCode: user?.currency?.currencyWallet || "USD",
                amount: priceForPay - minPriceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay - minPriceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "US",
                },
              });
            }

            // debugUtil({ text: 'onBeforePaymentCreate', value: paymentMethodType });

            handler.continuePaymentCreation();
          } catch (error: any) {
            errorMessage.code = error?.code;
            errorMessage.message = error?.message;
            handleError(errorMessage);

            // debugUtil({ text: 'onBeforePaymentCreate error', value: errorMessage });

            handler?.abortPaymentCreation();
          }
        },

        onPaymentMethodAction(action, { paymentMethodType }) {
          setIsLoading(false);

          if (action === "PAYMENT_METHOD_SELECTED") {
            if (paymentMethodType) {
              onPaymentMethodSelected?.(paymentMethodType!);
            }
          } else {
            onPaymentMethodAction?.();
          }

          if (action === "PAYMENT_METHOD_UNSELECTED") {
            // debugUtil({
            //   text: 'onPaymentMethodAction error',
            //   value: 'PAYMENT_METHOD_UNSELECTED',
            // });

            onPaymentMethodUnselected?.();
          } else {
            // debugUtil({ text: 'onPaymentMethodAction', value: action });
          }
        },
        async onCheckoutComplete(evt) {
          const { payment } = evt;

          const paymentInfoData = await getPrimerPaymentInfo({
            paymentId: payment?.id || "",
          });
          const paymentMethodType =
            paymentInfoData.paymentMethod.paymentMethodData.network ||
            paymentInfoData.processor.name;

          // debugUtil({ text: 'onCheckoutComplete', value: { payment, paymentMethodType } });

          handleSuccess({
            payment: payment!,
            paymentMethodType,
            paymentType: paymentInfoData.paymentMethod.paymentMethodType,
            currencyCode: paymentInfoData.currencyCode,
            paymentProcessor: paymentInfoData.processor.name,
            first6Digits:
              paymentInfoData.paymentMethod?.paymentMethodData?.first6Digits,
          });
        },

        errorMessage: {
          disabled: true,
          onErrorMessageShow(message) {
            setIsLoading(false);

            let msgObj = { code: "", message: declineReasons.UNKNOWN };
            try {
              msgObj = JSON.parse(message);
            } catch (error: any) {
              // debugUtil({ text: 'onErrorMessageShow', value: error?.message });
            }

            handleError({ ...msgObj, isActive: true });
          },
          onErrorMessageHide() {
            handleError({
              message: "",
              code: "",
              paymentId: "",
              isActive: false,
            });
          },
        },
        async onCheckoutFail(error, data, handler) {
          const { payment } = data;

          const errorMessage: Omit<ICheckoutFormError, "isActive"> = {
            code: "",
            message: "",
          };

          if (payment?.id) {
            errorMessage.paymentId = payment?.id;

            try {
              const errRes = await getSystemPaymentError({ id: payment.id });

              if (
                errRes.lastPaymentError.processorMessage.includes(
                  "payer.document",
                )
              ) {
                errorMessage.message = declineReasons.INVALID_NATIONAL_ID;
              } else if (!errRes.lastPaymentError.declineCode) {
                errorMessage.message = declineReasons.UNKNOWN;
              } else {
                const errorType =
                  (errRes.lastPaymentError.declineCode as DeclineReasonKeys) ||
                  "UNKNOWN";
                errorMessage.message = declineReasons[errorType];
              }
            } catch {
              errorMessage.message = declineReasons.UNKNOWN;
            }

            errorMessage.code = error?.code;
          } else {
            errorMessage.message = declineReasons.UNKNOWN;
          }

          // debugUtil({ text: 'onCheckoutFail', value: errorMessage });

          setIsLoading(false);
          handler?.showErrorMessage(JSON.stringify(errorMessage));
        },
      });

      setCheckoutInstance(instance);
    } catch (error: any) {
      console.error("Error initializing Primer:", error);
      setInitializationError(
        error?.message || "Failed to initialize payment form",
      );
      handleError({
        message: error?.message || "An error occurred",
        code: error?.code || "UNKNOWN",
        isActive: true,
        paymentId: "",
      });
    }
  };

  useEffect(() => {
    if (clientToken && !checkoutTriggeredRef.current) {
      checkoutTriggeredRef.current = true;

      handleCheckoutForm().finally(() => {
        onCheckoutFormFinally?.();
      });
    }
  }, [clientToken]);

  // return
  return (
    <div style={{ display: "grid", gridAutoFlow: "row", zIndex: 0 }}>
      <div
        className="w-full text-left"
        id="checkout-container"
        style={{ zIndex: 1 }}
      />

      {initializationError && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
          <h3 className="font-medium text-yellow-800">
            Payment form initialization failed
          </h3>
          <p className="mt-1 text-yellow-700">{initializationError}</p>
          <div className="mt-2 text-xs text-yellow-600">
            <p>Please check:</p>
            <ul className="mt-1 list-inside list-disc">
              <li>Your Primer client token is valid</li>
              <li>Your Primer environment is properly configured</li>
              <li>Network connectivity to Primer servers</li>
            </ul>
          </div>
        </div>
      )}

      {isSubmitButton && (
        <div className={"bg-[#ffffff]"} style={{ zIndex: 3 }}>
          {nationParam && (
            <div
              className={"space-y-6"}
              style={
                isLoading ? { pointerEvents: "none", opacity: "0.55" } : {}
              }
            >
              <div className="mb-4 flex flex-col">
                <label htmlFor="nationalID" className="text-[12.8px]">
                  {nationParam.label}
                </label>

                <input
                  id={"nation-id"}
                  type={"text"}
                  onChange={(evt) => {
                    setNationIdError(false);
                    nationIdRef.current = evt.target.value;
                  }}
                  className={`h-[46px] rounded-md border bg-gray-100 p-2 text-[16px]`}
                  style={{
                    ...checkoutFormStyles.input.base,
                    borderColor: nationIdError ? "red" : "",
                  }}
                  placeholder={nationParam.placeholder || "12345678901"}
                  maxLength={11}
                />

                {nationIdError && (
                  <span className="text-[12px] text-red-500">
                    {nationParam.error || "Required"}
                  </span>
                )}
              </div>
            </div>
          )}

          <Button
            id={"primer-checkout-credit-card-button"}
            isDisabled={isLoading && !error?.isActive}
            onClick={handleSubmit}
            className={"w-full"}
            startContent={submitBtn?.icon}
            style={{ color: "#fff", minHeight: "48px" }}
          >
            {submitBtn?.text || "Pay"}
          </Button>
        </div>
      )}

      {error?.isActive && (
        <div className="PrimerCheckout__errorMessage">{error.message}</div>
      )}
    </div>
  );
};

export default CheckoutFormComponent;

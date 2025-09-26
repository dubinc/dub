"use client";

import { Button } from "@dub/ui";
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
  ICheckoutFormError,
  ICheckoutFormSuccess,
  IPrimerClientError,
} from "./interface";

import { FC, ReactNode, useEffect, useRef, useState } from "react";

import { isValidDeclineReason } from "core/integration/payment/client/checkout-form/service";
import {
  getPaymentPlanPrice,
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/config";
import { apiInstance } from "core/lib/rest-api";
import { debugUtil } from "core/util";

import {
  getPrimerPaymentInfo,
  getSystemPaymentError,
} from "../../../payment/server";

import { Checkbox } from "@radix-ui/themes";
import "./style/form-style.css";

// interface
interface ICheckoutFormComponentProps {
  locale: string;
  theme?: "light" | "dark";
  user: ICustomerBody | null;
  submitBtn?: { text: string; icon?: ReactNode } | null;
  nationParam?: { label: string; placeholder?: string; error?: string } | null;
  paymentPlan?: TPaymentPlan;
  handleCheckoutError?: (errorObj: {
    error: IPrimerClientError;
    data: { payment?: Payment };
  }) => void;
  handleCheckoutSuccess: (data: ICheckoutFormSuccess) => void;
  onPaymentMethodUnselected?: () => void;
  onPaymentMethodSelected?: (paymentMethodType: string) => void;
  onPaymentMethodAction?: () => void;
  onCheckoutFormFinally?: () => void;
  handleOpenCardDetailsForm?: () => void;
  onBeforePaymentCreate?: (paymentMethodType: string) => void;
  onPaymentAttempt?: () => void;
  cardPreferredFlow?: CardPreferredFlow;
  termsAndConditionsText?: ReactNode;
}

// component
const CheckoutFormComponent: FC<ICheckoutFormComponentProps> = (props) => {
  const {
    locale,
    theme = "light",
    user,
    submitBtn,
    nationParam,
    paymentPlan = "PRICE_YEAR_PLAN",
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
    termsAndConditionsText,
  } = props;

  const checkoutTriggeredRef = useRef(false);
  const nationIdRef = useRef<string>("");

  const [checkoutInstance, setCheckoutInstance] =
    useState<PrimerCheckout | null>(null);
  const [nationIdError, setNationIdError] = useState<boolean>(false);
  const [isSubmitButton, setIsSubmitButton] = useState<boolean>(false);

  const [isChecked, setIsChecked] = useState(false);
  const isCheckedRef = useRef(false);

  // error handling for view
  const [error, setError] = useState<ICheckoutFormError>({
    message: "",
    code: "",
    isActive: false,
  });
  const handleError = (error: ICheckoutFormError) => {
    setIsLoading(false);

    setError(error);
  };

  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    setIsLoading(true);

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
      paymentPlan,
    });
    setIsLoading(false);
  };

  const clientToken = user?.paymentInfo?.clientToken || "";
  const handleCheckoutForm = async () => {
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
          code: paymentMethodType?.toString() || "",
          message: "",
          isActive: true,
        };

        if (!isCheckedRef.current) {
          errorMessage.message = "You must agree to the terms and conditions.";
          handleError(errorMessage);

          debugUtil({
            text: "onBeforePaymentCreate error",
            value: errorMessage,
          });

          handler?.abortPaymentCreation();
        }

        const userData = {
          ...user!,
          paymentInfo: {
            ...user?.paymentInfo,
            paymentMethodType: paymentMethodType,
          },
        };

        try {
          if (paymentMethodType) {
            onBeforePaymentCreate?.(paymentMethodType!);
          }

          if (paymentMethodType?.includes("CARD")) {
            const { priceForPay } = getPaymentPlanPrice({
              paymentPlan,
              user: {
                ...userData,
                currency: {
                  ...userData?.currency,
                  currencyForPay: user?.currency?.currencyCard,
                },
              },
            });

            await apiInstance.patch("checkout/session", {
              json: {
                clientToken,
                paymentPlan,
                currencyCode: user?.currency?.currencyCard,
                amount: priceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "",
                },
              },
            });
          }

          if (
            paymentMethodType?.includes("PAYPAL") &&
            user?.currency?.currencyCard !== user?.currency?.currencyPaypal
          ) {
            const { priceForPay } = getPaymentPlanPrice({
              paymentPlan,
              user: {
                ...userData,
                currency: {
                  ...userData?.currency,
                  currencyForPay: user?.currency?.currencyPaypal,
                },
              },
            });

            await apiInstance.patch("checkout/session", {
              json: {
                clientToken,
                paymentPlan,
                currencyCode: user?.currency?.currencyPaypal,
                amount: priceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "",
                },
              },
            });
          }

          if (
            (paymentMethodType?.includes("GOOGLE") ||
              paymentMethodType?.includes("APPLE")) &&
            user?.currency?.currencyCard !== user?.currency?.currencyWallet
          ) {
            const { priceForPay } = getPaymentPlanPrice({
              paymentPlan,
              user: {
                ...userData,
                currency: {
                  ...userData?.currency,
                  currencyForPay: user?.currency?.currencyWallet,
                },
              },
            });

            await apiInstance.patch("checkout/session", {
              json: {
                clientToken,
                paymentPlan,
                currencyCode: user?.currency?.currencyWallet,
                amount: priceForPay,
                order: {
                  lineItems: [
                    {
                      itemId: uuidV4(),
                      amount: priceForPay,
                      quantity: 1,
                    },
                  ],
                  countryCode: user?.currency?.countryCode || "",
                },
              },
            });
          }

          debugUtil({
            text: "onBeforePaymentCreate",
            value: paymentMethodType,
          });

          handler.continuePaymentCreation();
        } catch (error: any) {
          errorMessage.message = error?.message;
          handleError(errorMessage);

          debugUtil({
            text: "onBeforePaymentCreate error",
            value: errorMessage,
          });

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
          debugUtil({
            text: "onPaymentMethodAction error",
            value: "PAYMENT_METHOD_UNSELECTED",
          });

          onPaymentMethodUnselected?.();
        } else {
          debugUtil({ text: "onPaymentMethodAction", value: action });
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

        debugUtil({
          text: "onCheckoutComplete",
          value: { payment, paymentMethodType },
        });

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
            debugUtil({ text: "onErrorMessageShow", value: error?.message });
          }

          handleError({ ...msgObj, isActive: true });
        },
        onErrorMessageHide() {
          handleError({ message: "", code: "", isActive: false });
        },
      },
      async onCheckoutFail(error, data, handler) {
        handleCheckoutError?.({ error, data });

        const { payment } = data;

        const errorMessage: Omit<ICheckoutFormError, "isActive"> = {
          code: "",
          message: "",
        };

        if (payment?.id) {
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
              const errorType = isValidDeclineReason(
                errRes.lastPaymentError.declineCode,
              )
                ? errRes.lastPaymentError.declineCode
                : "UNKNOWN";
              errorMessage.message = declineReasons[errorType];
            }
          } catch {
            errorMessage.message = declineReasons.UNKNOWN;
          }

          errorMessage.code = error?.code;
        } else {
          errorMessage.message = declineReasons.UNKNOWN;
        }

        debugUtil({ text: "onCheckoutFail", value: errorMessage });

        setIsLoading(false);
        handler?.showErrorMessage(JSON.stringify(errorMessage));
      },
    });

    setCheckoutInstance(instance);
  };

  useEffect(() => {
    if (clientToken && !checkoutTriggeredRef.current) {
      checkoutTriggeredRef.current = true;

      handleCheckoutForm().finally(() => {
        onCheckoutFormFinally?.();
      });
    }
  }, [clientToken]);

  useEffect(() => {
    const utmList = JSON.parse(localStorage.getItem("utmValues") || "{}");

    if (
      utmList &&
      utmList.utm_source &&
      !utmList.utm_source.includes("email")
    ) {
      setIsChecked(true);
      isCheckedRef.current = true;
    }
  }, []);

  // return
  return (
    <>
      <div style={{ display: "grid", gridAutoFlow: "row", zIndex: 0 }}>
        <div
          className="w-full text-left"
          id="checkout-container"
          style={{ zIndex: 1 }}
        />

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
              id="primer-checkout-credit-card-button"
              disabled={isLoading && !error?.isActive}
              onClick={handleSubmit}
              className="min-h-[48px] w-full text-white"
              text={submitBtn?.text || "Pay"}
            />
          </div>
        )}

        {error?.isActive && (
          <div className="PrimerCheckout__errorMessage">{error.message}</div>
        )}
      </div>

      {checkoutInstance && (
        <div className="group flex gap-2">
          <Checkbox
            id="terms-and-conditions"
            checked={isChecked}
            onCheckedChange={(checked: boolean) => {
              setIsChecked(checked);
              isCheckedRef.current = checked;
            }}
          />
          <label
            htmlFor="terms-and-conditions"
            className="select-none text-sm text-xs font-medium text-neutral-500"
          >
            {termsAndConditionsText}
          </label>
        </div>
      )}
    </>
  );
};

export default CheckoutFormComponent;

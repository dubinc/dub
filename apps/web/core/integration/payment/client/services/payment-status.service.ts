import {
  getPrimerPaymentInfo,
  IGetPrimerClientPaymentInfoRes,
} from "../../server";

interface IPollPaymentStatusProps {
  paymentId: string;
  onPurchased: (info: IGetPrimerClientPaymentInfoRes) => void;
  onError: (info?: IGetPrimerClientPaymentInfoRes) => void;
  initialStatus?: IGetPrimerClientPaymentInfoRes["status"];
  retries?: number;
}

export const pollPaymentStatus = async ({
  paymentId,
  onPurchased,
  onError,
  initialStatus,
  retries = 20,
}: IPollPaymentStatusProps) => {
  if (retries <= 0) return;

  const finalStatuses = ["AUTHORIZED", "SETTLED", "CANCELLED", "DECLINED"];

  try {
    const paymentInfo = await getPrimerPaymentInfo({ paymentId });

    if (
      initialStatus &&
      finalStatuses.includes(initialStatus) &&
      initialStatus !== "CANCELLED" &&
      initialStatus !== "DECLINED"
    ) {
      return onPurchased(paymentInfo);
    }

    if (paymentInfo?.status && !finalStatuses.includes(paymentInfo?.status)) {
      setTimeout(
        () =>
          pollPaymentStatus({
            paymentId,
            onPurchased,
            onError,
            retries: retries - 1,
          }),
        2000,
      );
      return;
    }

    if (
      paymentInfo?.status !== "SETTLED" &&
      paymentInfo.status !== "AUTHORIZED"
    ) {
      return onError(paymentInfo);
    }

    return onPurchased(paymentInfo);
  } catch {
    return onError();
  }
};

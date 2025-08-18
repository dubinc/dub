import ky from "ky";
import {
  createPrimerClientPayment,
  createPrimerClientSession,
  getPrimerPaymentMethodToken,
  ICreatePrimerClientPaymentBody,
  ICreatePrimerClientSessionBody,
  IUpdatePrimerClientSessionBody,
  updatePrimerClientSession,
} from "./primer";
import {
  checkSystemSubscriptionStatus,
  createSystemTokenOnboarding,
  getSystemSubscriptionUpgradePaymentId,
  getSystemUserDataByEmail,
  getSystemUserProcessor,
  ICheckSystemSubscriptionStatusBody,
  ICreateSystemTokenOnboardingBody,
  IGetSystemUserDataBody,
  IUpdateSystemPaymentMethodBody,
  IUpdateSystemSubscriptionBody,
  IUpdateUserSystemDataBody,
  updateSystemSubscriptionPaymentMethod,
  updateSystemSubscriptionStatus,
  updateUserSystemData,
} from "./system";

// payment service
export class PaymentService {
  constructor() {}

  // create client payment session
  public async createClientPaymentSession(
    body: ICreatePrimerClientSessionBody,
  ) {
    return await createPrimerClientSession(body);
  }

  // update client payment session
  public async updateClientPaymentSession(
    body: IUpdatePrimerClientSessionBody,
  ) {
    return await updatePrimerClientSession(body);
  }

  // create client subscription
  public async createClientSubscription(
    body: ICreateSystemTokenOnboardingBody,
  ) {
    const paymentMethodToken = await getPrimerPaymentMethodToken({
      customerId: body.user.externalId || "",
    });

    const systemTokenOnboardingBody: ICreateSystemTokenOnboardingBody = {
      ...body,
      paymentMethodToken: paymentMethodToken || "",
    };
    console.log("systemTokenOnboardingBody", systemTokenOnboardingBody);

    const tokenOnboardingData = await createSystemTokenOnboarding(
      systemTokenOnboardingBody,
    );

    return { tokenOnboardingData, paymentMethodToken };
  }

  // update client subscription
  public async updateClientSubscription(
    id: string,
    body: IUpdateSystemSubscriptionBody,
  ) {
    return await updateSystemSubscriptionStatus(id, body);
  }

  // get upgrade primer payment id
  public async getUpgradePrimerPaymentId(upgradeId: string) {
    return await getSystemSubscriptionUpgradePaymentId(upgradeId);
  }

  // get client subscription data
  public async getClientSubscriptionDataByEmail(body: IGetSystemUserDataBody) {
    return await getSystemUserDataByEmail(body);
  }

  // check client subscription status
  public async checkClientSubscriptionStatus(
    body: ICheckSystemSubscriptionStatusBody,
  ) {
    return await checkSystemSubscriptionStatus(body);
  }

  // create client one time payment
  public async createClientOneTimePayment(
    body: ICreatePrimerClientPaymentBody,
  ) {
    return await createPrimerClientPayment(body);
  }

  // update client payment method
  public async updateClientPaymentMethod(body: IUpdateSystemPaymentMethodBody) {
    return await updateSystemSubscriptionPaymentMethod(body);
  }

  // update client data
  public async updateClientData(id: string, body: IUpdateUserSystemDataBody) {
    return await updateUserSystemData(id, body);
  }

  // check client card risk
  public async checkClientCardRisk(
    bin: string,
  ): Promise<{ type?: "toxic"; error?: string }> {
    try {
      const res = await ky.get<{ type?: "toxic" }>(
        `https://risk-engine-all.artem-035.workers.dev/?service_name=toxic_bins&product=hint&txn_th=150&dispute_rt_th=2&txn_val_th=500000&fraud_rt_th=9&bin=${bin}`,
      );
      return await res.json();
    } catch (error: any) {
      return { error: error?.message };
    }
  }

  // get processor by customerId from primer
  public async getProcessorByCustomerId(customerId: string) {
    return await getSystemUserProcessor(customerId);
  }
}

import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

import { v4 as uuidV4 } from "uuid";

import {
  ICreateStripeRadarSessionBody,
  ICreateStripeRadarSessionRes,
} from "core/integration/payment/client/session/session.interface";
import { debugUtil } from "core/util";

// interface
declare global {
  interface Window {
    Risk:
      | { init: (key: string) => { publishRiskData: () => Promise<string> } }
      | undefined;
  }
}

// create session for client
export const createSessionsForClient = async (
  stripePublicKeys: ICreateStripeRadarSessionBody[],
): Promise<ICreateStripeRadarSessionRes> => {
  try {
    await loadStripeClient();

    const sessions = await Promise.all(
      stripePublicKeys.map(async (item) => {
        const stripeSession = (await loadStripe(item.key)) as Stripe;

        const data = await stripeSession?.createRadarSession();

        return {
          stripeRadarSessionId: data?.radarSession?.id,
          name: item.name,
        };
      }),
    );

    const dataStripeSessions = Object.assign(
      {},
      ...sessions.map((session) => ({
        [session.name]: session.stripeRadarSessionId,
      })),
    );

    const dataPaypalSession = loadPaypalClient();

    // const dataCheckoutSession = await loadCheckoutClient();
    //
    // const dataAirwallexSession = await loadAirwallexClient();

    debugUtil({
      text: "createSessionsForClient",
      value: {
        ...dataStripeSessions,
        ...dataPaypalSession,
        // ...dataCheckoutSession,
        // ...dataAirwallexSession,
      },
    });

    return {
      ...dataStripeSessions,
      ...dataPaypalSession,
      // ...dataCheckoutSession,
      // ...dataAirwallexSession,
    };
  } catch (error: any) {
    const errorMsg =
      error?.response?.body?.error?.message ||
      error?.message ||
      "Something went wrong";

    debugUtil({ text: "createSessionsForClient error", value: error });
    throw new Error(errorMsg);
  }
};

// load stripe client
const loadStripeClient = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (window.Stripe) {
      resolve();
    } else {
      const scriptId = "stripe-js-script";
      const existingScript = document.getElementById(
        scriptId,
      ) as HTMLScriptElement;

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.Stripe) {
            resolve();
          } else {
            reject(new Error("Stripe.js failed to load."));
          }
        });

        existingScript.addEventListener("error", () => {
          reject(new Error("Stripe.js failed to load."));
        });
      } else {
        const script = document.createElement("script");

        script.id = scriptId;
        script.src = "https://js.stripe.com/v3/";
        script.async = true;
        script.onload = () => {
          if (window.Stripe) {
            resolve();
          } else {
            reject(new Error("Stripe.js failed to load."));
          }
        };

        script.onerror = () => reject(new Error("Stripe.js failed to load."));
        document.head.appendChild(script);
      }
    }
  });
};

// load paypal client
const loadPaypalClient = (): { [key: string]: string } => {
  const generatedF = uuidV4();

  const script = document.createElement("script");
  script.id = "paypal-script";
  script.src = `https://c.paypal.com/da/r/fb.js?f=${generatedF}&s=${process.env.NEXT_PUBLIC_PAY_PAL_MERCHANT_ID}_checkout-page&sandbox=${false}`;
  document.body.appendChild(script);

  const fraudNetScript = document.createElement("script");
  fraudNetScript.id = "paypal-fraudnet-script";
  fraudNetScript.src = "https://c.paypal.com/da/r/fb.js";
  document.body.appendChild(fraudNetScript);

  return {
    paypal_session_id: generatedF,
    paypal_client_metadata_id: generatedF,
  };
};

// load checkout client
// const loadCheckoutClient = async (): Promise<{
//   [key: string]: string | undefined;
// }> => {
//   const loadRiskScript = () =>
//     new Promise((resolve, reject) => {
//       if (window.Risk) {
//         resolve(window.Risk);
//         return;
//       }
//
//       const existingScript = document.getElementById(
//         "checkout-risk-script",
//       ) as HTMLScriptElement | null;
//       if (existingScript) {
//         existingScript.addEventListener("load", () => resolve(window.Risk));
//         existingScript.addEventListener("error", () =>
//           reject(new Error("Risk script failed to load")),
//         );
//         return;
//       }
//
//       const script = document.createElement("script");
//
//       script.id = "checkout-risk-script";
//       script.src = "https://risk.checkout.com/cdn/risk/1/risk.js";
//       script.async = true;
//       script.onload = () => resolve(window.Risk);
//       script.onerror = () => reject(new Error("Risk script failed to load"));
//       document.body.appendChild(script);
//     });
//
//   await loadRiskScript();
//
//   const riskData = async (): Promise<{ [key: string]: string | undefined }> => {
//     if (window.Risk && typeof window.Risk.init === "function") {
//       const risk = window.Risk.init(
//         `${process.env.NEXT_PUBLIC_PROD_RISKJS_KEY}`,
//       );
//
//       return new Promise((resolve) => {
//         risk.publishRiskData().then((id: string) => {
//           resolve({ checkout_session_id: id });
//         });
//       });
//     } else {
//       return new Promise((resolve) => {
//         resolve({});
//       });
//     }
//   };
//
//   return await riskData();
// };

// Load Airwallex client
// const loadAirwallexClient = async (): Promise<{
//   airwallex_session_id: string;
// }> => {
//   const airwallexSessionId = uuidV4();
//
//   return new Promise((resolve, reject) => {
//     const scriptId = "airwallex-fraud-api";
//
//     let script = document.getElementById(scriptId) as HTMLScriptElement;
//
//     if (script) {
//       script.setAttribute("data-order-session-id", airwallexSessionId);
//       return resolve({ airwallex_session_id: airwallexSessionId });
//     }
//
//     script = document.createElement("script");
//     script.id = scriptId;
//     script.type = "text/javascript";
//     script.async = true;
//     script.setAttribute("data-order-session-id", airwallexSessionId);
//     script.src =
//       "https://static.airwallex.com/webapp/fraud/device-fingerprint/index.js";
//
//     script.onload = () => resolve({ airwallex_session_id: airwallexSessionId });
//     script.onerror = () =>
//       reject(new Error("Airwallex Fingerprint script failed to load"));
//
//     document.body.appendChild(script);
//   });
// };

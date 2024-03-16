import { type Message } from "postmark";

// We are using this workaround because the internal postmark client uses axios and that prevents us from using the edge runtime.
// h/t @pepyta: https://github.com/ActiveCampaign/postmark.js/issues/130#issuecomment-1597104566
export const postmark = {
  /**
   * Sends an email through the Postmark API.
   * @param message The content of the email.
   * @returns The pure response object from the server.
   */
  sendEmail: async (message: Message) => {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY,
      } as any,
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(await response.json());
    }

    return await response.json();
  },
};

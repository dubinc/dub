import { APIClient, SendEmailRequest } from "customerio-node";

const client = new APIClient(process.env.CUSTOMER_IO_API_KEY!);

export const sendViaCustomerIO = (template: string, recipient: string, messageData?: Record<string, string>) => {
  const request = new SendEmailRequest({
    transactional_message_id: template,
    to: recipient,
    identifiers: {
      email: recipient,
    },
    message_data: messageData,
    send_to_unsubscribed: true,
  });

  return client.sendEmail(request);
};

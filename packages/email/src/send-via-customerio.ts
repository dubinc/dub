import { APIClient, SendEmailRequest } from "customerio-node";

const client = new APIClient(process.env.CUSTOMER_IO_API_KEY!);

export const sendViaCustomerIO = (template: string, recipient: string, messageData?: Record<string, string>) => {
  console.log("Sending email via Customer.io");
  console.log("template", template);
  console.log("recipient", recipient);
  console.log("messageData", messageData);
  console.log("process.env.CUSTOMER_IO_API_KEY", process.env.CUSTOMER_IO_API_KEY);
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

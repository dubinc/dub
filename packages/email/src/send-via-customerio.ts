import { APIClient, SendEmailRequest } from "customerio-node";

const client = new APIClient(process.env.CUSTOMER_IO_API_KEY!);

export const sendViaCustomerIO = (
  template: string,
  recipient: string,
  messageData?: Record<string, string>,
  customerId?: string,
) => {
  console.log(
    "process.env.CUSTOMER_IO_API_KEY",
    process.env.CUSTOMER_IO_API_KEY,
  );
  const request = new SendEmailRequest({
    transactional_message_id: template,
    to: recipient,
    identifiers: {
      email: recipient,
      id: customerId,
    },
    message_data: messageData,
  });

  return client.sendEmail(request);
};

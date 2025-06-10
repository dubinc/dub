const EmailApiUrl = 'https://mandrillapp.com/api/1.0/messages/send-template';

export type Var = { name: string; content: string };

export const sendViaMailchimp = (template: string, recipient: string, vars?: Var[]) => {
  const body = {
    key: process.env.MAILCHIMP_API_KEY,
    template_name: template,
    template_content: [],
    message: {
      to: [
        {
          email: recipient,
          type: 'to',
        },
      ],
      merge_vars: [
        {
          rcpt: recipient,
          vars,
        },
      ],
    },
  };

  return fetch(EmailApiUrl, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

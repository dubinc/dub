


export * from '@stripe/ui-extension-sdk/version';
export const BUILD_TIME = '2024-05-07 18:04:51.75841 +0530 IST m=+137.022160334';

export {  };

export default {
  "id": "com.example.dub",
  "version": "0.0.7",
  "name": "Dub",
  "icon": "",
  "permissions": [
    {
      "permission": "event_read",
      "purpose": "Informs Dub when the app has been installed and uninstalled."
    },
    {
      "permission": "webhook_read",
      "purpose": "Allows Dub to read webhooks"
    },
    {
      "permission": "customer_read",
      "purpose": "Allows Dub to read customer information."
    },
    {
      "permission": "charge_read",
      "purpose": "Allows Dub to read charge information."
    }
  ],
  "ui_extension": {
    "content_security_policy": {
      "connect-src": null,
      "image-src": null,
      "purpose": ""
    }
  },
  "allowed_redirect_uris": [
    "https://4eaf-103-181-40-87.ngrok-free.app/api/stripe-app/callback"
  ],
  "stripe_api_access_type": "oauth",
  "distribution_type": "public"
};

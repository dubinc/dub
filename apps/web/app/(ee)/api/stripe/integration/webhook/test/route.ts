/*
    POST /api/stripe/integration/webhook/test – listen to Stripe test mode connect webhooks (for Stripe Integration)

    We need a separate route for test webhooks because of how Stripe webhooks behave:
    - Live mode only: When a connected account is connected only in live mode to your platform, 
        the live Events and test Events are sent to your live Connect webhook endpoint.
    - Test mode only: When a connected account is connected only in test mode to your platform, 
        the test Events are sent to your test Connect webhook endpoint. Live Events are never sent.
    - Live mode and test mode: When a connected account is connected in live and in test mode to your platform, 
        the live Events are sent to your live Connect webhook endpoint 
        and the test Events are sent to both the live and the test Connect webhook endpoints.

    @see https://support.stripe.com/questions/connect-account-webhook-configurations
*/

export { POST } from "../route";

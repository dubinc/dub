/*

    POST /api/stripe/integration/webhook/test – listen to Stripe test webhooks (for Stripe Integration)
    We need a separate route for test webhooks because when a connected account is connected in live and in test mode, 
    the live Events are sent to our live Connect webhook endpoint 
    and the test Events are sent to both the live and the test Connect webhook endpoints.

    @see https://support.stripe.com/questions/connect-account-webhook-configurations
*/

export { POST } from "../route";

import * as z from "zod/v4";

// Stripe `cancellation_details.feedback` enum:
// https://docs.stripe.com/api/subscriptions/cancel
export const STRIPE_CANCELLATION_FEEDBACK = [
  "too_expensive",
  "missing_features",
  "switched_service",
  "unused",
  "too_complex",
  "low_quality",
  "customer_service",
  "other",
] as const;

export type StripeCancellationFeedback =
  (typeof STRIPE_CANCELLATION_FEEDBACK)[number];

export const STRIPE_CANCELLATION_FEEDBACK_LABELS: Record<
  StripeCancellationFeedback,
  string
> = {
  too_expensive: "It's too expensive",
  missing_features: "Some features are missing",
  switched_service: "I'm switching to a different service",
  unused: "I don't use this service enough",
  too_complex: "Ease of use was less than expected",
  low_quality: "Quality was less than expected",
  customer_service: "Customer service was less than expected",
  other: "Other reason",
};

export const STRIPE_CANCELLATION_FEEDBACK_EMAIL_COPY: Record<
  StripeCancellationFeedback,
  string
> = {
  customer_service: "you had a bad experience with our customer service",
  low_quality: "the product didn't meet your expectations",
  missing_features: "you were expecting more features",
  other: "you had another reason",
  switched_service: "you switched to a different service",
  too_complex: "the product was too complex",
  too_expensive: "the product was too expensive",
  unused: "you didn't use the product",
};

export const STRIPE_CANCELLATION_COMMENT_MAX_LENGTH = 1000;

export const cancelSubscriptionSchema = z.object({
  feedback: z.enum(STRIPE_CANCELLATION_FEEDBACK),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required.")
    .max(STRIPE_CANCELLATION_COMMENT_MAX_LENGTH),
});

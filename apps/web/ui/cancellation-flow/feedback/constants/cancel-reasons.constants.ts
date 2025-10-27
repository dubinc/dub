export const CANCEL_REASONS = [
  {
    value: "not_needed_anymore",
    label: "Not needed anymore",
  },
  {
    value: "subscription_not_worth_the_price",
    label: "Subscription is not worth the price",
  },
  {
    value: "key_features_are_missing",
    label: "Key features are missing",
  },
  {
    value: "switching_to_a_different_service",
    label: "Switching to a different service",
  },
  {
    value: "technical_problems_and_bugs",
    label: "Technical problems & bugs",
  },
  {
    value: "billing_issues",
    label: "Billing issues",
  },
  {
    value: "other",
    label: "Other",
  },
];

export const PLACEHOLDER_BY_REASON = {
  not_needed_anymore: "Please type the details here...",
  subscription_not_worth_the_price:
    "What price feels fair for you? What you lacked?",
  key_features_are_missing: "Which features you lacked...",
  switching_to_a_different_service:
    "Please tell us which service you switched to...",
  technical_problems_and_bugs: "Please share what went wrong...",
  billing_issues: "Please let us know what issues you've experienced...",
  other: "Please type the details here...",
};

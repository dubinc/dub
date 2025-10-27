// stripe sessions
export const stripeSessions = [
  {
    key: `${process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY}`,
    name: "stripe_session_id",
  },
  {
    key: `${process.env.NEXT_PUBLIC_STRIPE_UK_PUBLIC_KEY}`,
    name: "uk_stripe_session_id",
  },
  {
    key: `${process.env.NEXT_PUBLIC_STRIPE_CA_PUBLIC_KEY}`,
    name: "ca_stripe_session_id",
  },
  {
    key: `${process.env.NEXT_PUBLIC_STRIPE_AU_PUBLIC_KEY}`,
    name: "au_stripe_session_id",
  },
  {
    key: `${process.env.NEXT_PUBLIC_STRIPE_EU_PUBLIC_KEY}`,
    name: "eu_stripe_session_id",
  },
];

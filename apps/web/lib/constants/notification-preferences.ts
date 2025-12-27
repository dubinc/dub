// User-level notification preferences for email communications
export const NOTIFICATION_PREFERENCE_TYPES = [
  "dubLinks", // Dub Links product updates on app.dub.co
  "dubPartners", // Dub Partners product updates on app.dub.co
  "partnerAccount", // Updates to partner accounts on partners.dub.co
] as const;

export type NotificationPreferenceType =
  (typeof NOTIFICATION_PREFERENCE_TYPES)[number];

// Mapping from preference type to UserNotificationPreferences schema field names
// (1:1 mapping since we're using the same names as the schema)
export const NOTIFICATION_PREFERENCE_FIELD_MAP: Record<
  NotificationPreferenceType,
  "dubLinks" | "dubPartners" | "partnerAccount"
> = {
  dubLinks: "dubLinks",
  dubPartners: "dubPartners",
  partnerAccount: "partnerAccount",
};

// Default all preferences to true (opted in)
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  NotificationPreferenceType,
  boolean
> = {
  dubLinks: true,
  dubPartners: true,
  partnerAccount: true,
};

export const NOTIFICATION_PREFERENCE_LABELS: Record<
  NotificationPreferenceType,
  { title: string; description: string; link: string }
> = {
  dubLinks: {
    title: "Dub Links",
    description:
      "New Dub Links features and guides on how to manage and track your links",
    link: "https://dub.co/links",
  },
  dubPartners: {
    title: "Dub Partners",
    description:
      "New Dub Partners features and tips on how to grow your affiliate program",
    link: "https://dub.co/partners",
  },
  partnerAccount: {
    title: "Partner Account",
    description:
      "New program launches, feature updates, and tutorials on how to succeed as a partner",
    link: "https://partners.dub.co",
  },
};

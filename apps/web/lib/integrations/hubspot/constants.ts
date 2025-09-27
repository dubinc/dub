export const HUBSPOT_OBJECT_TYPE_IDS = [
  "0-1", // contact
  "0-3", // deal
] as const;

export const HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID = "closedwon";

export const HUBSPOT_DUB_CONTACT_PROPERTIES = [
  {
    label: "Dub Click ID",
    name: "dub_id",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
    formField: true, // Allow the property to be used in a HubSpot form.
  },
  {
    label: "Dub Link",
    name: "dub_link",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
  },
  {
    label: "Dub Partner Email",
    name: "dub_partner_email",
    type: "string",
    fieldType: "text",
    groupName: "contactinformation",
  },
];

// TODO:
// Check if we need all these constants to be exported

export const APPSFLYER_DEFAULT_SETTINGS = {
  appIds: [],
  parameters: [],
};

export const APPSFLYER_HARDCODED_PARAMETERS = [
  {
    key: "pid",
    value: "dubinc_int",
    description: "Partner ID",
  },
  {
    key: "clickid",
    value: "{dub_id}",
    description: "Dub click ID",
  },
  {
    key: "af_ua",
    value: "{userAgent}",
    description: "User agent",
  },
  {
    key: "af_ip",
    value: "{ipAddress}",
    description: "IP address",
  },
];

export const APPSFLYER_REQUIRED_PARAMETERS = [
  {
    key: "c",
    value: "{{PARTNER_NAME}}",
    description: "Campaign name",
  },
  {
    key: "af_siteid",
    value: "{{PARTNER_LINK_KEY}}",
    description: "Site ID",
  },
];

export const APPSFLYER_IP_RANGES = ["45.92.116.0/22", "194.28.46.0/23"];

export const APPSFLYER_MACROS = [
  {
    macro: "{{PARTNER_NAME}}",
    description: "The partner's name",
  },
  {
    macro: "{{PARTNER_LINK_KEY}}",
    description: "The partner's link key",
  },
];

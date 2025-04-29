export type TWifiEncryptionOption = {
  id: string;
  label: string;
};

export const WIFI_ENCRYPTION_TYPES: TWifiEncryptionOption[] = [
  { id: "WEP", label: "WEP" },
  { id: "WPA", label: "WPA/WPA2" },
  { id: "none", label: "none" },
];

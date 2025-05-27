export type TWifiEncryptionOption = {
  id: string;
  label: string;
};

export const WIFI_ENCRYPTION_TYPES: TWifiEncryptionOption[] = [
  { id: "WPA", label: "WPA/WPA2 (recommended)" },
  { id: "WEP", label: "WEP (less common)" },
  { id: "none", label: "No encryption (open network)" },
];

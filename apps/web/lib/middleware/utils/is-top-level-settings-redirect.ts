const topLevelSettingRedirects = [
  "/domains",
  "/integrations",
  "/referrals",
  "/webhooks",
];

export const isTopLevelSettingsRedirect = (path: string) => {
  return (
    topLevelSettingRedirects.includes(path) ||
    topLevelSettingRedirects.some((redirect) => path.startsWith(`${redirect}/`))
  );
};

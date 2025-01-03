import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  Box,
  Icon,
  Inline,
  Link,
  SettingsView,
} from "@stripe/ui-extension-sdk/ui";

const AppSettings = ({
  userContext,
  environment,
  appContext,
  oauthContext,
}: ExtensionContextValue) => {
  console.log({
    userContext,
    environment,
    appContext,
    oauthContext,
  });

  return (
    <SettingsView onSave={() => {}}>
      <Box
        css={{
          background: "container",
          borderRadius: "medium",
          padding: "large",
        }}
      >
        <Box css={{ marginBottom: "small" }}>
          <Icon name="settings" size="medium" />
        </Box>
        Hello there
        <Inline css={{ fontFamily: "monospace" }}>
          src/views/AppSettings.tsx
        </Inline>{" "}
        and save to reload this view.
        <Link
          target="_blank"
          href={
            "https://stripe.com/docs/stripe-apps/build-test-views#add-application-settings"
          }
        >
          <Box css={{ marginTop: "medium" }}>
            Adding application settings <Icon name="arrowRight" size="xsmall" />
          </Box>
        </Link>
      </Box>
    </SettingsView>
  );
};

export default AppSettings;

import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";
import {
  createHttpClient,
  STRIPE_API_KEY,
} from "@stripe/ui-extension-sdk/http_client";
import { Link, SignInView } from "@stripe/ui-extension-sdk/ui";
import { useEffect } from "react";
import Stripe from "stripe";
import appIcon from "../icon.svg";
import { getSecret } from "../utils/secrets";
import { Token } from "../utils/types";

// You don't need an API Key here, because the app uses the
// dashboard credentials to make requests.
const stripe: Stripe = new Stripe(STRIPE_API_KEY, {
  httpClient: createHttpClient() as Stripe.HttpClient,
  apiVersion: "2023-08-16",
});

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

  useEffect(() => {
    // setSecret({
    //   stripe,
    //   name: "token",
    //   payload: JSON.stringify({
    //     access_token: "123",
    //     refresh_token: "456",
    //     token_type: "Bearer",
    //     expires_in: 3600,
    //     scope: "read_write",
    //   }),
    // });

    getSecret<Token>({
      stripe,
      name: "token",
    });
  }, []);

  return (
    <SignInView
      description="Connect your Dub workspace with Stripe to start tracking the conversions."
      primaryAction={{
        label: "Connect workspace",
        href: "https://example.com",
      }}
      footerContent={
        <>
          Don't have an Dub account?{" "}
          <Link href="https://app.dub.co/register">Sign up</Link>
        </>
      }
      brandColor="#000000"
      brandIcon={appIcon}
    />
  );

  // return (
  //   <SettingsView onSave={() => {}}>
  //     <Box
  //       css={{
  //         background: "container",
  //         borderRadius: "medium",
  //         padding: "large",
  //       }}
  //     >
  //       <Box css={{ marginBottom: "small" }}>
  //         <Icon name="settings" size="medium" />
  //       </Box>
  //       Hello there
  //       <Inline css={{ fontFamily: "monospace" }}>
  //         src/views/AppSettings.tsx
  //       </Inline>{" "}
  //       and save to reload this view.
  //       <Link
  //         target="_blank"
  //         href={
  //           "https://stripe.com/docs/stripe-apps/build-test-views#add-application-settings"
  //         }
  //       >
  //         <Box css={{ marginTop: "medium" }}>
  //           Adding application settings <Icon name="arrowRight" size="xsmall" />
  //         </Box>
  //       </Link>
  //     </Box>
  //   </SettingsView>
  // );
};

export default AppSettings;

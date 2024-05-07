import { Box, ContextView, Inline, Link } from "@stripe/ui-extension-sdk/ui";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";

import BrandIcon from "./brand_icon.svg";

/**
 * This is a view that is rendered in the Stripe dashboard's customer detail page.
 * In stripe-app.json, this view is configured with stripe.dashboard.customer.detail viewport.
 * You can add a new view by running "stripe apps add view" from the CLI.
 */
const App = ({ userContext, environment }: ExtensionContextValue) => {
  return (
    <ContextView
      title="Hello world"
      brandColor="#F6F8FA" // replace this with your brand color
      brandIcon={BrandIcon} // replace this with your brand icon
      externalLink={{
        label: "View docs",
        href: "https://stripe.com/docs/stripe-apps"
      }}
    >
      <Box css={{ height: "fill", stack: "y", distribute: "space-between" }}>
        <Box
          css={{
            background: "container",
            borderRadius: "medium",
            marginTop: "small",
            padding: "large",
          }}>
          Edit{" "}
          <Inline css={{ fontFamily: "monospace" }}>src/views/App.tsx</Inline>{" "}
          and save to reload this view.
        </Box>

        <Box css={{ color: "secondary" }}>
          <Box css={{ marginBottom: "medium" }}>
            Learn more about views, authentication, and accessing data in{" "}
            <Link
              href="https://stripe.com/docs/stripe-apps"
              target="blank"
              type="secondary"
            >
              Stripe Apps docs
            </Link>
            .
          </Box>

          <Box css={{ marginBottom: "medium" }}>
            Questions? Get help with your app from the{" "}
            <Link
              href="https://github.com/stripe/stripe-apps/wiki/Developer-Support"
              target="blank"
              type="secondary"
            >
              Stripe Apps Developer Support
            </Link>
            .
          </Box>
        </Box>
      </Box>
    </ContextView>
  );
};

export default App;

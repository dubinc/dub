import { capitalize } from "@dub/utils";
import { Body, Head, Html, Link, Preview, Text } from "@react-email/components";
import { type TrialMarketingEmailProps } from "../../types";
import {
  bodyStyle,
  footerLinkStyle,
  footerStyle,
  linkStyle,
  pStyle,
} from "./styles-constants";

export default function Trial3DaysRemainingEmail({
  name = "Dave",
  plan = "business",
  workspaceSlug = "acme",
}: TrialMarketingEmailProps) {
  const dashboardUrlPrefix = `https://app.dub.co/${workspaceSlug}`;
  return (
    <Html>
      <Head />
      <Preview>
        Don't forget to review your selected plan and billing details.
      </Preview>
      <Body style={bodyStyle}>
        <Text style={pStyle}>Hi {name ? name.split(" ")[0] : "there"},</Text>

        <Text style={pStyle}>
          How are things going on your end? You have 3 days left in your Dub{" "}
          {capitalize(plan)} trial, so I wanted to reach out before your trial
          ends to make sure you have everything you need.
        </Text>

        <Text style={pStyle}>
          If something is blocking you, just reply to this email and we'd be
          happy to help you out.
        </Text>

        <Text style={pStyle}>
          If Dub is indeed a perfect fit (and I really hope it is!), please
          double-check your{" "}
          <Link
            href={`${dashboardUrlPrefix}/settings/billing`}
            style={linkStyle}
          >
            billing details
          </Link>{" "}
          to ensure you have the right card on file, so your plan can be
          activated with no issues.
        </Text>

        <Text style={pStyle}>
          Always here if you have any questions or feedback!
        </Text>

        <Text style={{ ...pStyle, marginBottom: 0 }}>
          Best,
          <br />
          Steven – Founder,{" "}
          <Link href="https://dub.co" style={linkStyle}>
            Dub.co
          </Link>
        </Text>

        <Text style={footerStyle}>
          If you&apos;d like me to stop sending you emails, please{" "}
          <Link
            href="https://app.dub.co/account/settings"
            style={footerLinkStyle}
          >
            click here
          </Link>
        </Text>
      </Body>
    </Html>
  );
}

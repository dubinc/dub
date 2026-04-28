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

export default function Trial7DaysRemainingEmail({
  name = "Dave",
  plan = "business",
}: TrialMarketingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Here are some resources to help you get the most out of your Dub trial.
      </Preview>
      <Body style={bodyStyle}>
        <Text style={pStyle}>Hi {name ? name.split(" ")[0] : "there"},</Text>

        <Text style={pStyle}>
          We're officially halfway through your Dub {capitalize(plan)} trial, so
          I wanted to check in here and see if you need any help – do you have
          any questions or blockers?
        </Text>

        <Text style={pStyle}>
          If you haven't already, please check out our{" "}
          <Link href="https://dub.co/help" style={linkStyle}>
            help center
          </Link>{" "}
          and{" "}
          <Link href="https://dub.co/docs" style={linkStyle}>
            documentation
          </Link>{" "}
          to learn more about Dub and our various use cases.
        </Text>

        <Text style={pStyle}>
          Excited to see how you plan to use Dub! Thank you for giving us a
          chance 🙏
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

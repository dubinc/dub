import {
  Mjml,
  MjmlBody,
  MjmlColumn,
  MjmlSection,
  MjmlText,
  MjmlWrapper,
} from "mjml-react";
import { capitalize, nFormatter } from "@/lib/utils";
import ButtonPrimary from "./components/ButtonPrimary";
import Divider from "./components/Divider";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";
import { grayDark } from "./components/theme";
import { ProjectProps } from "@/lib/types";

export default function UsageExceeded({
  project,
  type,
}: {
  project: ProjectProps;
  type: "first" | "second";
}): JSX.Element {
  const { slug, name, usage, usageLimit, plan } = project;
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="Usage Limit Exceeded" />
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">Hey there!</MjmlText>
              <MjmlText cssClass="paragraph">
                Just wanted to reach out and let you know that your project,{" "}
                <strong> {name} </strong> has exceeded the
                <strong> {capitalize(plan)} Plan </strong>
                limit of <strong>{nFormatter(usageLimit)} link clicks</strong>.
                You have used{" "}
                <strong>{nFormatter(usage, 2)} link clicks</strong> across all
                your projects in your current billing cycle.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                All your existing links will continue to work, and I'm still
                collecting data on them, but you'll need to upgrade to view
                their stats, edit them, or add more links.
              </MjmlText>
              <ButtonPrimary
                link={`https://app.dub.sh/${slug}/settings/billing`}
                uiText="Upgrade my plan"
              />
              <MjmlText cssClass="paragraph">
                To respect your inbox,{" "}
                {type === "first"
                  ? "I will only send you one more email about this in 3 days"
                  : "this will be the last time I'll email you about this for the current billing cycle"}
                . Feel free to ignore this email if you don't plan on upgrading,
                or reply to let me know if you have any questions!
              </MjmlText>
              <MjmlText cssClass="paragraph" color={grayDark}>
                Steven from Dub
              </MjmlText>
              <Divider />
            </MjmlColumn>
          </MjmlSection>
          <Footer />
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}

import Head from "./components/Head";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ButtonPrimary from "./components/ButtonPrimary";
import { leadingRelaxed, textBase, textLg, textSm } from "./components/theme";

import {
  Mjml,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlText,
  MjmlSpacer,
  MjmlDivider,
} from "mjml-react";

const DomainInvalid = ({
  domain,
  projectSlug,
}: {
  domain: string;
  projectSlug: string;
}): JSX.Element => {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <Header title="Invalid Domain Configuration" />
        <MjmlSection cssClass="smooth">
          <MjmlColumn>
            <MjmlText cssClass="paragraph">Hey there!</MjmlText>
            <MjmlText cssClass="paragraph">
              We noticed that your domain <code>{domain}</code> for your Dub
              project{" "}
              <a href={`https://app.dub.sh/${projectSlug}`} target="_blank">
                {projectSlug}↗
              </a>{" "}
              has been invalid for 25 days.
            </MjmlText>
            <MjmlText cssClass="paragraph">
              If your domain remains unconfigured for 30 days, your project will
              be automatically deleted.
            </MjmlText>
            <ButtonPrimary
              link={`https://app.dub.sh/${projectSlug}/settings`}
              uiText="Configure my domain"
            />
            <MjmlText cssClass="paragraph">
              If you do not want to keep this project on Dub, you can safely
              ignore this email.
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>
        <Footer />
      </MjmlBody>
    </Mjml>
  );
};

export default DomainInvalid;

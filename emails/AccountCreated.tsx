import Head from "./components/Head";
import Header from "./components/Header";
import Footer from "./components/Footer";
import {
  Mjml,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlText,
  MjmlImage,
  MjmlSpacer,
} from "mjml-react";
import ButtonPrimary from "./components/ButtonPrimary";
import {
  leadingTight,
  leadingRelaxed,
  textBase,
  textXl,
} from "./components/theme";

const AccountCreated = ({ name }: { name?: string }): JSX.Element => {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={600}>
        <Header loose />
        <MjmlSection padding="0">
          <MjmlColumn>
            <MjmlImage
              cssClass="hero"
              padding="0 0 40px"
              align="left"
              src="https://s3.amazonaws.com/lab.campsh.com/bb-hero%402x.jpg"
            />
          </MjmlColumn>
        </MjmlSection>
        <MjmlSection padding="0 24px" cssClass="smooth">
          <MjmlColumn>
            <MjmlText
              cssClass="paragraph"
              padding="0"
              fontSize={textXl}
              lineHeight={leadingTight}
            >
              {name}, your table awaits.
            </MjmlText>
            <MjmlText
              padding="24px 0 0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
              cssClass="paragraph"
            >
              Thank you for joining BookBook! We’re excited to help you enjoy
              great meals without any begging, guessing, waiting or phone calls.
              Just a couple taps, and the table is yours.
            </MjmlText>
            <MjmlSpacer height="24px" />
            <ButtonPrimary
              link={"https://app.dub.sh/"}
              uiText={"Create a project"}
            />
            <MjmlSpacer height="24px" />
            <MjmlText
              padding="0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
              cssClass="paragraph"
            >
              Enjoy!
              <br />
              The BookBook Team
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>
        <Footer />
      </MjmlBody>
    </Mjml>
  );
};

export default AccountCreated;

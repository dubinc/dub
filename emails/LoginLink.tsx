import Head from "./components/Head";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ButtonPrimary from "./components/ButtonPrimary";
import { leadingRelaxed, textBase, textSm } from "./components/theme";

import {
  Mjml,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlText,
  MjmlSpacer,
  MjmlDivider,
} from "mjml-react";

const LoginLink = ({ url }: { url: string }): JSX.Element => {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={400}>
        <Header title="Your Login Link" />
        <MjmlSection padding="0" cssClass="smooth">
          <MjmlColumn>
            <MjmlText
              padding="8px 0"
              fontSize={textSm}
              lineHeight={leadingRelaxed}
            >
              Welcome to Dub!
            </MjmlText>
            <MjmlText
              padding="8px 0"
              fontSize={textSm}
              lineHeight={leadingRelaxed}
            >
              Please click the magic link below to sign in to your account.
            </MjmlText>
            <ButtonPrimary link={url} uiText="Sign In" />
            <MjmlText
              cssClass="paragraph"
              padding="8px 0"
              fontSize={textSm}
              lineHeight={leadingRelaxed}
            >
              You can also copy the link below and paste it into the browser of
              your choice.
            </MjmlText>
            <MjmlSpacer height="8px" />
            <MjmlText
              cssClass="paragraph"
              padding="10px 0"
              fontSize={textSm}
              lineHeight={leadingRelaxed}
            >
              {url.replace(/^https?:\/\//, "")}
            </MjmlText>
            <MjmlDivider
              borderColor="#666"
              borderStyle="dotted"
              borderWidth="1px"
              padding="16px 0 0"
            ></MjmlDivider>
            <MjmlText
              padding="16px 0"
              fontSize={textSm}
              lineHeight={leadingRelaxed}
              cssClass="paragraph"
            >
              If you did not request this email you can safely ignore it.
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>
        <Footer />
      </MjmlBody>
    </Mjml>
  );
};

export default LoginLink;

import { ReactElement } from "react";
import Head from "./components/Head";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ButtonPrimary from "./components/ButtonPrimary";
import { leadingRelaxed, textBase } from "./components/theme";

import {
  Mjml,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlText,
  MjmlSpacer,
  MjmlDivider,
} from "mjml-react";

type ResetPasswordProps = {
  name: string;
  body: ReactElement;
  ctaText: string;
};

const ResetPassword: React.FC<ResetPasswordProps> = ({
  name,
  body,
  ctaText,
}) => {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={400}>
        <Header />
        <MjmlSection padding="0 24px" cssClass="smooth">
          <MjmlColumn>
            <MjmlDivider
              borderColor="#666"
              borderStyle="dotted"
              borderWidth="1px"
              padding="8px 0 16px 0"
            ></MjmlDivider>
            <MjmlText
              padding="16px 0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
              cssClass="paragraph"
            >
              Hello {name},
            </MjmlText>
            <MjmlText
              cssClass="paragraph"
              padding="0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
            >
              <>{body}</>
            </MjmlText>
            <MjmlSpacer height="24px" />
            <ButtonPrimary link={"#"} uiText={ctaText} />
            <MjmlSpacer height="8px" />
            <MjmlText
              padding="16px 0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
              cssClass="paragraph"
            >
              ♥,
              <br />
              The BookBook Team
            </MjmlText>
            <MjmlDivider
              borderColor="#666"
              borderStyle="dotted"
              borderWidth="1px"
              padding="16px 0 0"
            ></MjmlDivider>
          </MjmlColumn>
        </MjmlSection>
        <Footer />
      </MjmlBody>
    </Mjml>
  );
};

export default ResetPassword;

import { ReactElement } from "react";
import Head from "./components/Head";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ButtonPrimary from "./components/ButtonPrimary";
import {
  leadingTight,
  leadingRelaxed,
  textBase,
  textLg,
} from "./components/theme";

import {
  Mjml,
  MjmlBody,
  MjmlSection,
  MjmlColumn,
  MjmlText,
  MjmlSpacer,
  MjmlDivider,
} from "mjml-react";

type ReservationProps = {
  headline: string;
  body: ReactElement;
  bulletedList: ReactElement;
  ctaText?: string;
};

const Reservation: React.FC<ReservationProps> = ({
  headline,
  body,
  bulletedList,
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
              padding="8px 0"
            ></MjmlDivider>
            <MjmlText
              padding="24px 0"
              fontSize={textLg}
              lineHeight={leadingTight}
              cssClass="paragraph"
            >
              {headline}
            </MjmlText>
            {bulletedList}
            <MjmlSpacer height="16px" />
            <MjmlText
              cssClass="paragraph"
              padding="0"
              fontSize={textBase}
              lineHeight={leadingRelaxed}
            >
              <>{body}</>
            </MjmlText>
            {ctaText && (
              <>
                <MjmlSpacer height="24px" />
                <ButtonPrimary link={"#"} uiText={ctaText} />
                <MjmlSpacer height="8px" />
              </>
            )}
            <MjmlDivider
              borderColor="#666"
              borderStyle="dotted"
              borderWidth="1px"
              padding="32px 0 0"
            ></MjmlDivider>
          </MjmlColumn>
        </MjmlSection>
        <Footer />
      </MjmlBody>
    </Mjml>
  );
};

export default Reservation;

import {
  Mjml,
  MjmlBody,
  MjmlColumn,
  MjmlSection,
  MjmlText,
  MjmlWrapper,
} from "mjml-react";
import Divider from "./components/Divider";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";

export default function FeedbackEmail({
  email,
  feedback,
}: {
  email?: string;
  feedback: string;
}): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="New Feedback Received" />
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">
                New feedback from{" "}
                {email ? <strong>{email}</strong> : "a Dub.sh user"}:
              </MjmlText>
              <MjmlText cssClass="paragraph">{feedback}</MjmlText>
              <Divider />
            </MjmlColumn>
          </MjmlSection>
          <Footer footnote={false} />
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}

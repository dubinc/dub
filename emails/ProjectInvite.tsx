import {
  Mjml,
  MjmlBody,
  MjmlColumn,
  MjmlSection,
  MjmlText,
  MjmlWrapper,
} from "mjml-react";
import ButtonPrimary from "./components/ButtonPrimary";
import Divider from "./components/Divider";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";
import { purple } from "./components/theme";

export default function ProjectInvite({
  url,
  projectName,
}: {
  url: string;
  projectName: string;
}): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="Your Dub Invite" />
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">
                You've been invited to join the <strong>{projectName}</strong>{" "}
                project on Dub!
              </MjmlText>
              <MjmlText cssClass="paragraph">
                You can use the magic link below to sign in to Dub and join the
                project.
              </MjmlText>
              <ButtonPrimary link={url} uiText="Join Project" />
              <MjmlText cssClass="paragraph">
                If you're on a mobile device, you can also copy the link below
                and paste it into the browser of your choice.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                <a
                  rel="nofollow"
                  style={{
                    textDecoration: "none",
                    color: `${purple} !important`,
                  }}
                >
                  {url.replace(/^https?:\/\//, "")}
                </a>
              </MjmlText>
              <MjmlText cssClass="paragraph">
                If you did not request this email, you can safely ignore it.
              </MjmlText>
              <Divider />
            </MjmlColumn>
          </MjmlSection>
          <Footer footnote={false} />
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}

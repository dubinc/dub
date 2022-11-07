import {
  Mjml,
  MjmlBody,
  MjmlColumn,
  MjmlImage,
  MjmlSection,
  MjmlText,
  MjmlWrapper,
} from "mjml-react";
import Divider from "./components/Divider";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";
import { grayDark } from "./components/theme";

export default function WelcomeEmail({ name }: { name?: string }): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="Welcome to Dub" />
          <MjmlSection padding="0">
            <MjmlColumn>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://dub.sh/_static/thumbnail.png"
              />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">
                Thanks for signing up{name && `, ${name}`}!
              </MjmlText>
              <MjmlText cssClass="paragraph">
                My name is Steven, and I'm the creator of Dub - the open-source
                Bitly alternative. I'm excited to have you on board!
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Here are a few things you can do:
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Create a custom{" "}
                <a href="https://app.dub.sh/links" target="_blank">
                  Dub.sh short link
                </a>
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Create a new{" "}
                <a href="https://app.dub.sh/" target="_blank">
                  project
                </a>{" "}
                and add your custom domain
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Star the repo on{" "}
                <a href="https://github.com/steven-tey/dub" target="_blank">
                  GitHub
                </a>
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Follow us on{" "}
                <a href="https://twitter.com/dubdotsh/" target="_blank">
                  Twitter
                </a>
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Let me know if you have any questions or feedback. I'm always
                happy to help!
              </MjmlText>
              <MjmlText cssClass="paragraph" color={grayDark}>
                Steven from Dub
              </MjmlText>
              <Divider />
            </MjmlColumn>
          </MjmlSection>
          <Footer unsubscribe />
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}

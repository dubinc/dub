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
import { grayDark, purple } from "./components/theme";

export default function WelcomeEmail({
  domains,
}: {
  domains?: string[];
}): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="A Belated Welcome to Dub" />
          <MjmlSection padding="0">
            <MjmlColumn>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://raw.githubusercontent.com/steven-tey/dub/main/public/_static/thumbnail.png"
              />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">
                Welcome to Dub - the open-source Bitly alternative!
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Apologies for the belated welcome message - I just{" "}
                <a
                  href="https://twitter.com/steventey/status/1579471673325408257"
                  target="_blank"
                >
                  got transactional emails working
                </a>{" "}
                this weekend.
              </MjmlText>
              {domains ? (
                <MjmlText cssClass="paragraph">
                  I noticed that you've been successfully using Dub with your
                  custom domain
                  {domains.length > 1 ? "s" : ""}{" "}
                  {domains.map((domain) => (
                    <span key={domain}>
                      <code>
                        <a
                          rel="nofollow"
                          style={{
                            textDecoration: "none",
                            color: `${purple} !important`,
                          }}
                        >
                          {domain}
                        </a>
                      </code>
                      {", "}
                    </span>
                  ))}{" "}
                  and I wanted to reach out to ask if you have any feedback or
                  suggestions for Dub? I'd love to hear from you!
                </MjmlText>
              ) : (
                <MjmlText cssClass="paragraph">
                  I noticed that you recently signed up for Dub but haven't
                  successfully connected a custom domain yet, and I wanted to
                  reach out to ask if you have any questions about that?
                </MjmlText>
              )}
              <MjmlText cssClass="paragraph">
                In case you missed it, I also revamped our pricing model and
                made it more affordable for everyone. You can read more about it{" "}
                <a
                  href="https://twitter.com/dubdotsh/status/1579466952594292737"
                  target="_blank"
                >
                  here
                </a>
                .
              </MjmlText>
              <MjmlText cssClass="paragraph">
                If you haven't already, here are a few more things you can do:
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Follow us on{" "}
                <a href="https://twitter.com/dubdotsh/" target="_blank">
                  Twitter
                </a>
              </MjmlText>
              <MjmlText cssClass="li">
                •&nbsp;&nbsp;Star the repo on{" "}
                <a href="https://github.com/steven-tey/dub" target="_blank">
                  GitHub
                </a>
              </MjmlText>
              {domains ? (
                <MjmlText cssClass="paragraph" color={grayDark}>
                  P.S.: You'll receive an email from Trustpilot in the next
                  couple of days - if you enjoyed using Dub, it would mean a lot
                  if you could leave a review; if not, I'd love to hear what I
                  can do to improve Dub!
                </MjmlText>
              ) : (
                <MjmlText cssClass="paragraph">
                  Looking forward to hearing from you!
                </MjmlText>
              )}
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

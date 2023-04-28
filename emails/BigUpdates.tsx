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

export default function BigUpdates({ slug }): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="Exciting New Updates from Dub" />
          <MjmlSection padding="0">
            <MjmlColumn>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://d2vwwcvoksz7ty.cloudfront.net/email-assets/updates.gif"
              />
            </MjmlColumn>
          </MjmlSection>
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlText cssClass="paragraph">Happy Friday! </MjmlText>
              <MjmlText cssClass="paragraph">
                Today, we are rolling out one of the biggest updates to{" "}
                <a href="https://dub.sh" target="_blank">
                  Dub
                </a>
                :
              </MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;Unlimited custom domains per project
              </MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;Improved pricing (higher limits)
              </MjmlText>
              <MjmlText cssClass="li">◆&nbsp;&nbsp;Link search</MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;Ability to duplicate a link
              </MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;Project-level billing
              </MjmlText>

              <Divider bottomPadding />
              <MjmlText cssClass="subtitle">
                1. Unlimited custom domains per project
              </MjmlText>

              <MjmlText cssClass="paragraph">
                You can now use as many custom domains as you want with your Dub
                project - no need to create multiple projects for all your
                domains.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                The best part? Filtering your short links by custom domain
              </MjmlText>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://d2vwwcvoksz7ty.cloudfront.net/email-assets/domains-filter.jpeg"
              />

              <Divider bottomPadding />
              <MjmlText cssClass="subtitle">
                2. Improved pricing, with higher limits for Pro users.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Migrating to Tinybird earlier this year allowed us to scale our
                platform by magnitudes.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Thanks to that, we're also increasing the limits for our Pro
                plan from 10K clicks/month to 50K clicks/month.
              </MjmlText>
              {slug ? (
                <MjmlText cssClass="paragraph">
                  <a
                    href={`https://app.dub.sh/${slug}/settings/billing`}
                    target="_blank"
                  >
                    Upgrade to Pro
                  </a>{" "}
                  today.
                </MjmlText>
              ) : (
                <MjmlText cssClass="paragraph">
                  Check out our{" "}
                  <a href="https://dub.sh#pricing" target="_blank">
                    new pricing structure
                  </a>
                  .
                </MjmlText>
              )}

              <Divider bottomPadding />
              <MjmlText cssClass="subtitle">3. Link search</MjmlText>
              <MjmlText cssClass="paragraph">
                You can now search through your existing short links by their
                key and destination URL.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                This has been a popular feature request for folks with a ton of
                short links, so I'm super excited to see this land.
              </MjmlText>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://d2vwwcvoksz7ty.cloudfront.net/email-assets/link-search.gif"
              />

              <Divider bottomPadding />
              <MjmlText cssClass="subtitle">
                4. Ability to duplicate a link
              </MjmlText>
              <MjmlText cssClass="paragraph">
                This is a quality-of-life improvement for busy marketers who
                want to quickly create multiple version of a short link.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Shoutout to Cameron Archer from Tinybird for the feature
                request!
              </MjmlText>
              <MjmlImage
                cssClass="hero"
                padding="0"
                align="left"
                src="https://d2vwwcvoksz7ty.cloudfront.net/email-assets/duplicate-link.gif"
              />

              <Divider bottomPadding />
              <MjmlText cssClass="subtitle">5. Project-level billing</MjmlText>

              <MjmlText cssClass="paragraph">
                Previously, having billing on a personal account level was a
                confusing UX.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Often times, users would upgrade to Pro on their personal
                accounts but not their project. They also couldn't invite
                teammates to pay invoices.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Migrating billing to the project-level fixes that.
              </MjmlText>

              <Divider bottomPadding />
              <MjmlText cssClass="paragraph">
                This update was many months in the making, so I'm very excited
                to see it finally land.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Have a wonderful weekend!
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

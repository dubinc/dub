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
import { grayLight } from "./components/theme";

export default function MayRecap({
  slug,
}: {
  slug: string | null;
}): JSX.Element {
  return (
    <Mjml>
      <Head />
      <MjmlBody width={500}>
        <MjmlWrapper cssClass="container">
          <Header title="Dub.sh May Product Recap" />
          <MjmlSection cssClass="smooth">
            <MjmlColumn>
              <MjmlImage
                cssClass="hero"
                padding="0 0 20px 0"
                border={`1px solid ${grayLight}`}
                borderRadius={8}
                align="left"
                href="https://dub.sh/changelog/team-invites"
                src="https://d2vwwcvoksz7ty.cloudfront.net/changelog/team-invites.png"
              />
              <MjmlText cssClass="subtitle">Team Invites</MjmlText>
              <MjmlText cssClass="paragraph">
                You can now invite teammates to your Dub project. This is useful
                if you want to collaborate with your team on a project.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Dub has the most generous free plan in the industry. You can
                invite up to 2 teammates to your project (3 total users) for
                free.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Need to invite more teammates? Upgrade to our{" "}
                <a href="https://dub.sh/pricing" target="_blank">
                  Pro plan
                </a>{" "}
                for unlimited teammates.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                {slug ? (
                  <a
                    href={`https://app.dub.sh/${slug}/settings/people`}
                    target="_blank"
                  >
                    Start inviting your team →
                  </a>
                ) : (
                  <a
                    href="https://dub.sh/changelog/team-invites"
                    target="_blank"
                  >
                    Read the changelog →
                  </a>
                )}
              </MjmlText>

              <Divider bottomPadding />
              <MjmlImage
                cssClass="hero"
                padding="0 0 20px 0"
                border={`1px solid ${grayLight}`}
                borderRadius={8}
                align="left"
                href="https://dub.sh/changelog/introducing-tags"
                src="https://d2vwwcvoksz7ty.cloudfront.net/changelog/introducing-tags.png"
              />
              <MjmlText cssClass="subtitle">
                Tags – a smarter way to manage your links on Dub
              </MjmlText>
              <MjmlText cssClass="paragraph">With tags, you can now:</MjmlText>
              <MjmlText cssClass="li">
                ◆ Organize your links by campaigns, clients, etc.
              </MjmlText>
              <MjmlText cssClass="li">◆ Filter your links by tags</MjmlText>
              <MjmlText cssClass="li">◆ Easily edit/delete your tags</MjmlText>
              <MjmlText cssClass="paragraph">
                <a
                  href="https://dub.sh/changelog/introducing-tags"
                  target="_blank"
                >
                  Read the changelog →
                </a>
              </MjmlText>

              <Divider bottomPadding />
              <MjmlImage
                cssClass="hero"
                padding="0 0 20px 0"
                border={`1px solid ${grayLight}`}
                borderRadius={8}
                align="left"
                href="https://dub.sh/changelog/pass-url-parameters"
                src="https://d2vwwcvoksz7ty.cloudfront.net/changelog/pass-url-parameters.png"
              />
              <MjmlText cssClass="subtitle">
                Pass URL Parameters to Destination URL
              </MjmlText>
              <MjmlText cssClass="paragraph">
                You can now pass URL query parameters from your short link to
                its destination URL.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                If there are any duplicate parameters, the parameter in the
                short link will override its counterpart in the destination URL.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                <a
                  href="https://dub.sh/changelog/pass-url-parameters"
                  target="_blank"
                >
                  Read the changelog →
                </a>
              </MjmlText>

              <Divider bottomPadding />
              <MjmlImage
                cssClass="hero"
                padding="0 0 20px 0"
                border={`1px solid ${grayLight}`}
                borderRadius={8}
                align="left"
                href="https://dub.sh/changelog/all-time-link-stats"
                src="https://d2vwwcvoksz7ty.cloudfront.net/changelog/all-time-link-stats.png"
              />
              <MjmlText cssClass="subtitle">All-Time Link Stats</MjmlText>
              <MjmlText cssClass="paragraph">
                You can now view the all-time statistics for each of your Dub
                shortlinks via the "All Time" filter option.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                Note: This is a{" "}
                <a href="https://dub.sh/pricing" target="_blank">
                  Pro-only
                </a>{" "}
                feature, along with the 90-day ("Last 3 months") filter.
              </MjmlText>
              <MjmlText cssClass="paragraph">
                <a
                  href="https://dub.sh/stats/github?interval=all"
                  target="_blank"
                >
                  See this in action →
                </a>
              </MjmlText>

              <Divider bottomPadding />
              <MjmlImage
                cssClass="hero"
                padding="0 0 20px 0"
                border={`1px solid ${grayLight}`}
                borderRadius={8}
                align="left"
                href="https://dub.sh/changelog"
                src="https://dub.sh/api/og/changelog"
              />
              <MjmlText cssClass="subtitle">Dub.sh Changelog</MjmlText>
              <MjmlText cssClass="paragraph">
                Here are a few other features that we shipped this month:
              </MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;
                <a
                  href="https://dub.sh/changelog/sign-in-with-google"
                  target="_blank"
                >
                  Sign In With Google
                </a>
              </MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;
                <a
                  href="https://dub.sh/changelog/improved-link-management"
                  target="_blank"
                >
                  Archiving links
                </a>
              </MjmlText>
              <MjmlText cssClass="li">◆&nbsp;&nbsp;Show my links only</MjmlText>
              <MjmlText cssClass="li">
                ◆&nbsp;&nbsp;Allow '/' in custom shortlinks
              </MjmlText>
              <MjmlText cssClass="paragraph">
                <a href="https://dub.sh/changelog" target="_blank">
                  Read our changelog →
                </a>
              </MjmlText>
              <Divider bottomPadding />
            </MjmlColumn>
          </MjmlSection>
          <Footer unsubscribe />
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}

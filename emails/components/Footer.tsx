import { MjmlSection, MjmlColumn, MjmlText } from "mjml-react";
import { grayDark, textSm } from "./theme";

export default function Footer({ unsubscribe }: { unsubscribe?: boolean }) {
  return (
    <MjmlSection cssClass="smooth">
      <MjmlColumn>
        <MjmlText cssClass="footer" fontSize={textSm} color={grayDark}>
          © {new Date().getFullYear()} Dub.sh
          {unsubscribe && (
            <>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="{{{ pm:unsubscribe }}}" target="_blank">
                Unsubscribe
              </a>
            </>
          )}
        </MjmlText>
      </MjmlColumn>
    </MjmlSection>
  );
}

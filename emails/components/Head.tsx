import React, { ReactElement } from "react";
import {
  MjmlHead,
  MjmlFont,
  MjmlAttributes,
  MjmlAll,
  MjmlStyle,
  MjmlRaw,
} from "mjml-react";
import {
  black,
  blue,
  borderBase,
  grayDark,
  grayLight,
  purple,
  textSm,
} from "./theme";

type HeadProps = { children?: ReactElement };

const Head: React.FC<HeadProps> = ({ children }) => {
  return (
    <MjmlHead>
      <>
        <MjmlRaw>
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
        </MjmlRaw>
        <MjmlFont
          name="Inter"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700"
        />
        <MjmlStyle>{`
        strong {
          font-weight: 700;
        }
        .smooth {
          -webkit-font-smoothing: antialiased;
        }
        .title > * {
          font-weight: 400 !important;
          font-size: 24px !important;
        }
        .paragraph > * {
          font-size: 14px !important;
          line-height: 24px !important;
        }
        .paragraph a {
          color: ${blue} !important;
          text-decoration: none;
        }
        .paragraph code {
          color: ${purple} !important;
        }
        .li {
          text-indent: -18px;
          margin-left: 24px;
          display: inline-block;
        }
        .footer {
          padding: 24px 24px 48px !important;
          border-top: 1px solid ${grayDark};
        }
        .footer a {
          text-decoration: none !important;
          color: ${grayDark} !important;
        }
        .button {
          border-radius: 3rem !important;
          color: ${black} !important;
          align-items: left !important;
          height: 32px !important;
          font-weight: 600 !important;
          font-size: ${textSm} !important;
        }
        @media (min-width:480px) {
          td.hero {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
        @media (prefers-color-scheme: dark) {
          body {
            background: ${black};
          }
          .logo > * {
            filter: invert(1) !important;
          }
          .title > * {
            color: #fff !important;
          }
          .paragraph > * {
            color: #fff !important;
          }
          .dark-mode {
            display: inherit;
          }
          .light-mode {
            display: none;
          }
        }
      `}</MjmlStyle>
        <MjmlAttributes>
          <MjmlAll font-family='Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' />
        </MjmlAttributes>
        {children}
      </>
    </MjmlHead>
  );
};

export default Head;

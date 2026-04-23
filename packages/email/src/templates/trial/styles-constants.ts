import type { CSSProperties } from "react";

/** Gmail-style stack — matches “pasted from compose” HTML. */
export const fontFamily = "Helvetica Neue, Liberation Sans, Arial, sans-serif";

export const bodyStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#222222",
  fontFamily,
  fontSize: 13,
  lineHeight: "20px",
  margin: 0,
  padding: "16px 20px",
};

export const pStyle: CSSProperties = {
  margin: "0 0 16px",
};

export const linkStyle: CSSProperties = {
  color: "#1a0dab",
  textDecoration: "underline",
  fontFamily,
  fontSize: 13,
};

export const footerStyle: CSSProperties = {
  margin: "24px 0 0",
  fontSize: 10,
  lineHeight: "16px",
  color: "#999999",
  fontFamily,
};

export const footerLinkStyle: CSSProperties = {
  ...linkStyle,
  fontSize: 10,
};

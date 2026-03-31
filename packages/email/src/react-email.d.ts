declare module "@react-email/components" {
  import * as React from "react";

  export const Html: React.FC<React.HtmlHTMLAttributes<HTMLHtmlElement>>;
  export const Head: React.FC<React.HTMLAttributes<HTMLHeadElement>>;
  export const Body: React.FC<React.HTMLAttributes<HTMLBodyElement>>;
  export const Container: React.FC<React.TableHTMLAttributes<HTMLTableElement>>;
  export const Section: React.FC<React.TableHTMLAttributes<HTMLTableElement>>;
  export const Row: React.FC<React.HTMLAttributes<HTMLTableRowElement>>;
  export const Column: React.FC<
    React.TdHTMLAttributes<HTMLTableDataCellElement>
  >;
  export const Img: React.FC<React.ImgHTMLAttributes<HTMLImageElement>>;
  export const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  export const Text: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  export const Heading: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  export const Hr: React.FC<React.HTMLAttributes<HTMLHRElement>>;
  export const Preview: React.FC<{ children: React.ReactNode }>;
  export const Tailwind: React.FC<{ children: React.ReactNode }>;
}

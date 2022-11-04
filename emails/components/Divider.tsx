import { MjmlDivider } from "mjml-react";
import { grayDark, grayLight } from "./theme";

export default function Divider({
  bottomPadding,
}: {
  bottomPadding?: boolean;
}): JSX.Element {
  return (
    <>
      <MjmlDivider
        cssClass="light-mode"
        borderColor={grayLight}
        borderWidth="1px"
        padding={bottomPadding ? "24px" : "24px 24px 0px"}
      ></MjmlDivider>
      <MjmlDivider
        cssClass="dark-mode"
        borderColor={grayDark}
        borderWidth="1px"
        padding={bottomPadding ? "24px" : "24px 24px 0px"}
      ></MjmlDivider>
    </>
  );
}

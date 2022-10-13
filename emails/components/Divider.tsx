import { MjmlDivider } from "mjml-react";
import { grayDark, grayLight } from "./theme";

export default function Divider(): JSX.Element {
  return (
    <>
      <MjmlDivider
        cssClass="light-mode"
        borderColor={grayLight}
        borderWidth="1px"
        padding="24px 24px 0px"
      ></MjmlDivider>
      <MjmlDivider
        cssClass="dark-mode"
        borderColor={grayDark}
        borderWidth="1px"
        padding="24px 24px 0px"
      ></MjmlDivider>
    </>
  );
}

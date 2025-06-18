import Script from "next/script";

import { FC, ReactNode } from "react";
import { SupportChatbot } from "../help/elements/support-chat-bot";

interface IHelpLayoutProps {
  children: ReactNode;
}

const BillingLayout: FC<Readonly<IHelpLayoutProps>> = ({ children }) => {
  return (
    <>
      <main>{children}</main>

      <SupportChatbot />

      <Script async defer src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_URL} />
      <Script src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_SCRIPT_URL} />
    </>
  );
};

export default BillingLayout;

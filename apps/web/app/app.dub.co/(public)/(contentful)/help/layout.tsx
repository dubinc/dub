import Script from "next/script";

import { HelpCenterHeaderComponent } from "./elements/help-center-header";

import { FC, ReactNode } from "react";
import { SupportChatbot } from "./elements/support-chat-bot";

interface IHelpLayoutProps {
  children: ReactNode;
}

const HelpLayout: FC<Readonly<IHelpLayoutProps>> = ({ children }) => {
  return (
    <>
      <HelpCenterHeaderComponent />
      <main className="relative mx-auto h-full w-full max-w-screen-2xl px-3 py-5 md:px-20 md:py-16">
        {children}
      </main>
      <SupportChatbot />

      <Script async defer src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_URL} />
      <Script src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_SCRIPT_URL} />
    </>
  );
};

export default HelpLayout;

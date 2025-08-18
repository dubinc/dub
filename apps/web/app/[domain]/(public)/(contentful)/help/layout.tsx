import { HelpCenterHeaderComponent } from "./elements/help-center-header";
import { ChatbotWrapper } from "./elements/support-chat-bot/chatbot-wrapper";

import { FC, ReactNode } from "react";

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
      <ChatbotWrapper />
    </>
  );
};

export default HelpLayout;

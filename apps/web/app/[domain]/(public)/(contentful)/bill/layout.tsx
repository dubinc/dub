import { FC, ReactNode } from "react";
import { ChatbotWrapper } from "../help/elements/support-chat-bot/chatbot-wrapper";

interface IHelpLayoutProps {
  children: ReactNode;
}

const BillingLayout: FC<Readonly<IHelpLayoutProps>> = ({ children }) => {
  return (
    <>
      <main>{children}</main>
      <ChatbotWrapper />
    </>
  );
};

export default BillingLayout;

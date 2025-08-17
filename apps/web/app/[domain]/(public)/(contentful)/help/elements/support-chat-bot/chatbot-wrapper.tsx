'use client';

import Script from "next/script";
import { ReactNode, useRef } from "react";
import { SupportChatbot } from "./support-chat-bot";
import { ScriptProvider, useScriptContext } from "./script-context";

interface ChatbotWrapperProps {
  children?: ReactNode;
}

const BotpressScripts = () => {
  const { setScriptsLoaded } = useScriptContext();
  const scriptsLoadedCount = useRef(0);

  const handleScriptLoad = () => {
    scriptsLoadedCount.current++;
    // Signal when both scripts are loaded
    if (scriptsLoadedCount.current === 2) {
      setScriptsLoaded(true);
    }
  };

  return (
    <>
      <Script 
        async 
        defer 
        src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_URL} 
        onLoad={handleScriptLoad}
      />
      <Script 
        src={process.env.NEXT_PUBLIC_BOTPRESS_WEBCHAT_SCRIPT_URL} 
        onLoad={handleScriptLoad}
      />
    </>
  );
};

export const ChatbotWrapper: React.FC<ChatbotWrapperProps> = ({ children }) => {
  return (
    <ScriptProvider>
      {children}
      <SupportChatbot />
      <BotpressScripts />
    </ScriptProvider>
  );
};

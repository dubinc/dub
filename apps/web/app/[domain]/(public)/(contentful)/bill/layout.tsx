import Script from "next/script";

import { FC, ReactNode, useRef } from "react";
import { SupportChatbot } from "../help/elements/support-chat-bot";
import { ScriptProvider, useScriptContext } from "../help/elements/support-chat-bot/script-context";

interface IHelpLayoutProps {
  children: ReactNode;
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

const BillingLayout: FC<Readonly<IHelpLayoutProps>> = ({ children }) => {
  return (
    <ScriptProvider>
      <main>{children}</main>
      <SupportChatbot />
      <BotpressScripts />
    </ScriptProvider>
  );
};

export default BillingLayout;

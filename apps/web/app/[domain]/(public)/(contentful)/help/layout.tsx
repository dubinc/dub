import Script from "next/script";

import { HelpCenterHeaderComponent } from "./elements/help-center-header";

import { FC, ReactNode, useRef } from "react";
import { SupportChatbot } from "./elements/support-chat-bot";
import { ScriptProvider, useScriptContext } from "./elements/support-chat-bot/script-context";

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

const HelpLayout: FC<Readonly<IHelpLayoutProps>> = ({ children }) => {
  return (
    <ScriptProvider>
      <HelpCenterHeaderComponent />
      <main className="relative mx-auto h-full w-full max-w-screen-2xl px-3 py-5 md:px-20 md:py-16">
        {children}
      </main>
      <SupportChatbot />
      <BotpressScripts />
    </ScriptProvider>
  );
};

export default HelpLayout;

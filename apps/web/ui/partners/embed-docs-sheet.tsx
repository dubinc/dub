import { X } from "@/ui/shared/icons";
import { Button, Sheet, TabSelect, useRouterStuff } from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface EmbedDocsSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type Tab = "react" | "html";

function EmbedDocsSheetContent({ setIsOpen }: EmbedDocsSheetProps) {
  const [tab, setTab] = useState<Tab>("react");

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Embed docs
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="p-3">
          <TabSelect
            variant="accent"
            options={[
              { id: "react", label: "React" },
              { id: "html", label: "HTML" },
            ]}
            selected={tab}
            onSelect={(id: Tab) => {
              setTab(id);
            }}
          />

          <div className="border-t border-neutral-200 pt-4">
            {tab === "react" && (
              <div>
                <CodeSnippet code={reactSnippet} lang="javascript" />
              </div>
            )}

            {tab === "html" && (
              <div>
                <CodeSnippet code={htmlSnippet} lang="html" />
              </div>
            )}
          </div>

          <p className="mt-10 text-sm text-neutral-500">
            View detailed{" "}
            <a
              href="https://dub.co/docs/sdks/client-side/embed"
              target="_blank"
              className="underline transition-colors duration-75 hover:text-neutral-600"
            >
              installation guides
            </a>{" "}
            to add Dub Embed to your website.
          </p>
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Close"
            className="w-fit"
          />
        </div>
      </div>
    </>
  );
}

const reactSnippet = `import { DubWidget } from "@dub/embed-react";

const App = () => {
  const [token, setToken] = useState("");

  const createToken = async () => {
    // create a token for the token
    setToken("PUBLIC_LINK_TOKEN");
  };

  useEffect(() => {
    createToken();
  }, []);

  return <DubWidget 
    token={token} 
    onTokenExpired={createToken} 
  />`;

const htmlSnippet = `<script type="module" src="https://www.dubcdn.com/embed/script.js"></script>

<script>
  const createToken = async () => {
    // create a token for the token
    return "PUBLIC_LINK_TOKEN";
  };

  document.addEventListener("DOMContentLoaded", () => {
    Dub.init({
      token: await createToken(),
    });
  });
</script>
`;

function CodeSnippet({ code, lang }: { code: string; lang: string }) {
  const [highlightedCode, setHighlightedCode] = useState("");

  useEffect(() => {
    const highlight = async () => {
      const html = await codeToHtml(code, {
        lang,
        theme: "min-light",
      });

      setHighlightedCode(html);
    };

    highlight();
  }, [code, lang]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
      style={{ fontSize: "14px", marginTop: "10px", overflowX: "auto" }}
    />
  );
}

export function EmbedDocsSheet({
  isOpen,
  ...rest
}: EmbedDocsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId" })}
    >
      <EmbedDocsSheetContent {...rest} />
    </Sheet>
  );
}

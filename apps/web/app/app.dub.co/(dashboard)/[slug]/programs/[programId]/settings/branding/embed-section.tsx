"use client";

import { Button, Check, Copy, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { toast } from "sonner";

export function EmbedSection() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Embed snippets
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          View our {/* TODO: Update link to an installation guide */}
          <a
            href="https://dub.co/help/category/partners"
            target="_blank"
            className="underline hover:text-neutral-800"
          >
            installation guide
          </a>{" "}
          to add Dub Embed to your website
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {[
          { name: "React snippet", lang: "jsx", code: reactSnippet },
          { name: "HTML snippet", lang: "html", code: htmlSnippet },
        ].map((props) => (
          <Snippet key={props.name} {...props} />
        ))}
      </div>
    </div>
  );
}

function Snippet({
  name,
  code,
  lang,
}: {
  name: string;
  code: string;
  lang: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
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
    <div className="rounded-lg border border-neutral-200 p-6">
      <div className="flex justify-between">
        <h3 className="text-base font-medium text-neutral-900">{name}</h3>
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text={copied ? "Copied" : "Copy"}
          icon={
            <div className="relative size-4">
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  copied && "translate-y-1 opacity-0",
                )}
              >
                <Copy className="size-4" />
              </div>
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  !copied && "translate-y-1 opacity-0",
                )}
              >
                <Check className="size-4" />
              </div>
            </div>
          }
          onClick={() =>
            toast.promise(copyToClipboard(code), {
              success: "Copied to clipboard!",
            })
          }
        />
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
        className="mt-4 overflow-x-auto bg-neutral-50 px-5 py-6 text-sm [&>pre.shiki]:!bg-neutral-50 [&_.line::before]:hidden"
      />
    </div>
  );
}

const reactSnippet = `import { DubEmbed } from "@dub/embed-react";

const App = () => {
  const [token, setToken] = useState("");

  const createToken = async () => {
    // create a token for the token
    setToken("PUBLIC_LINK_TOKEN");
  };

  useEffect(() => {
    createToken();
  }, []);

  return <DubEmbed 
    data="referrals"
    token={token}
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

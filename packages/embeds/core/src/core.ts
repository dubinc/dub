import { DUB_CONTAINER_ID, EMBED_REFERRALS_URL } from "./constants";
import { EmbedError } from "./error";
import { DubEmbedOptions, DubInitResult, IframeMessage } from "./types";

const CONTAINER_STYLES = {
  position: "relative",
  maxWidth: "1024px",
  height: "1020px",
  margin: "0 auto",
};

class DubEmbed {
  options: DubEmbedOptions;
  container: HTMLElement | null;

  constructor(options: DubEmbedOptions) {
    this.options = options;

    console.debug("[Dub] Initializing.", options);

    this.container = this.renderEmbed();
  }

  /**
   * Generates and renders all of the embed's DOM elements.
   */
  renderEmbed() {
    console.debug("[Dub] Rendering embed.");

    const { token, root, containerStyles, onError, data } = this.options;

    const existingContainer = document.getElementById(DUB_CONTAINER_ID);

    if (existingContainer) return existingContainer;

    if (!token) {
      console.error("[Dub] A link token is required to for the embed to work.");
      return null;
    }

    const container = document.createElement("div");
    container.id = DUB_CONTAINER_ID;
    Object.assign(container.style, {
      ...CONTAINER_STYLES,
      ...containerStyles,
    });

    const iframeUrl = data === "referrals" ? EMBED_REFERRALS_URL : "";

    if (!iframeUrl) {
      console.error("[Dub] Invalid embed data type.");
      return null;
    }

    const iframe = createIframe(iframeUrl, token, this.options);
    container.appendChild(iframe);

    // Listen the message from the iframe
    window.addEventListener("message", (e) => {
      const { data, event } = e.data as IframeMessage;

      console.debug("[Dub] Iframe message", data);

      if (event === "ERROR") {
        onError?.(
          new EmbedError({
            code: data?.code ?? "",
            message: data?.message ?? "",
          }),
        );
      }
    });

    (root ?? document.body).appendChild(container);

    return container;
  }

  /**
   * Destroys the embed, removing any remaining DOM elements.
   */
  destroy() {
    document.getElementById(DUB_CONTAINER_ID)?.remove();
  }
}

const createIframe = (
  iframeUrl: string,
  token: string,
  options: Pick<DubEmbedOptions, "theme" | "themeOptions">,
): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  const params = new URLSearchParams({
    token,
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.themeOptions
      ? { themeOptions: JSON.stringify(options.themeOptions) }
      : {}),
  });

  iframe.src = `${iframeUrl}?${params.toString()}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");
  iframe.setAttribute("allow", "clipboard-write");

  return iframe;
};

/**
 * Initializes the Dub embed.
 */
export const init = (options: DubEmbedOptions): DubInitResult => {
  const embed = new DubEmbed(options);

  return {
    destroy: embed.destroy.bind(embed),
  };
};

import { isBlacklistedDomain } from "@/lib/edge-config/is-blacklisted-domain";
import { updateConfig } from "@/lib/edge-config/update";
import { getDomainWithoutWWW } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { experimental_evaluate as evaluate } from "ai";

export async function maliciousLinkCheck(url: string) {
  const domain = getDomainWithoutWWW(url);

  if (!domain) {
    return false;
  }

  const domainStatus = await isBlacklistedDomain(domain);

  if (domainStatus === "blacklisted") {
    return true;
  }

  // skip remaining checks for trusted domains
  if (domainStatus === "whitelisted") {
    return false;
  }

  // run jev check
  try {
    const result = await evaluate({
      model: "typesafe-ai/jev",
      state: { url, domain },
      questions: {
        isMalicious: {
          type: "boolean",
          instructions:
            "Is this destination abusive to publish as a public short link?",
          criteria: {
            true: {
              meaning:
                "Yes if the URL is meant to deceive, steal credentials or funds, deliver malware, or is a category we refuse to shorten. One strong match is enough.",
              matches_any: [
                "Phishing or brand impersonation: login, verify, KYC, billing, shipping, wallet-connect, or support pages mimicking banks/utilities, marketplaces, crypto, Microsoft/Google/Adobe/Apple, carriers, government, or Roblox — including typosquats, hyphenated lookalikes, and extra-TLD hosts like brand.com.evil.tld.",
                "Those same lures on throwaway hosting (Vercel, Netlify, Weebly, Blogspot, Surge, Firebase, serveo, Cloudflare, DuckDNS, Azure blobs, Heroku, tiiny.site, IPFS, AWS lambda URLs, Google Sites, Microsoft Forms).",
                "Another URL shortener, cloaking/redirector, or QR-code hop (nested shortening).",
                "Adult, porn, cam, or dating-spam sites.",
                "Malware, fake downloads/updates, scareware, crypto drainers, or pirate IPTV/streaming.",
                "Gibberish, keyboard-smash, punycode/IDN homograph, raw-IP, or random smashed-dictionary domains used for cloaking (yhujykujujk.xyz, concealmentbroad.com).",
              ],
            },
            false: {
              meaning:
                "No if this is a normal site someone would reasonably shorten.",
              even_if: [
                "It has a real login or checkout on the organization's own official domain.",
                "It is a legitimate app on Vercel/Netlify/GitHub Pages with no impersonation signals.",
                "The brand is unfamiliar or new, as long as the name is coherent and not a lookalike, shortener, or gibberish domain.",
              ],
            },
          },
        },
      },
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
        },
      },
    });

    const maliciousProbability = result.answers.isMalicious.probability;

    console.log("typesafe/jev check results:");
    console.log({
      url,
      domain,
      probability: maliciousProbability,
      isMalicious: maliciousProbability > 0.5,
    });

    // if high probability, add to blacklist
    if (maliciousProbability > 0.8) {
      waitUntil(
        updateConfig({
          key: "domains",
          value: domain,
        }),
      );
    }

    return maliciousProbability > 0.5;
  } catch (error) {
    console.error("typesafe/jev check error:", error);
    return false;
  }
}

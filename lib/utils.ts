import ms from "ms";

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    } else if (res.status === 403) {
      throw new Error("Forbidden");
    } else if (res.status === 404) {
      throw new Error("Not Found");
    } else if (res.status === 500) {
      throw new Error("Internal Server Error");
    } else {
      throw new Error("An unexpected error occurred");
    }
  }

  return res.json();
}

export function nFormatter(num: number, digits?: number) {
  if (!num) return "0";
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits || 1).replace(rx, "$1") + item.symbol
    : "0";
}

export function linkConstructor({
  key,
  domain = "dub.sh",
  localhost,
  pretty,
}: {
  key: string;
  domain?: string;
  localhost?: boolean;
  pretty?: boolean;
}) {
  const link = `${
    localhost ? "http://localhost:3000" : `https://${domain}`
  }/${key}`;

  return pretty ? link.replace(/^https?:\/\//, "") : link;
}

export const getTitleFromUrl = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // timeout if it takes longer than 2 seconds
  const title = await fetch(url, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      return res.text();
    })
    .then((body: string) => {
      let match = body.match(/<title>([^<]*)<\/title>/); // regular expression to parse contents of the <title> tag
      if (!match || typeof match[1] !== "string") return "No title found"; // if no title found, return "No title found"
      return match[1];
    })
    .catch((err) => {
      console.log(err);
      return "No title found"; // if there's an error, return "No title found"
    });
  return title;
};

export const timeAgo = (timestamp: number): string => {
  if (!timestamp) return "never";
  return `${ms(Date.now() - timestamp)} ago`;
};

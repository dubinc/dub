/**
 * Node version of `safeFetch`. It runs the request through an undici agent
 * whose `lookup` checks every resolved IP when the socket connects. The IP we
 * check is the IP we connect to, so DNS rebinding cannot pass the check.
 *
 * Only for the Node runtime. Edge routes use `safeFetch` from `safe-fetch.ts`.
 */

import dns from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isPrivateIp } from "./is-private-ip";
import { createSafeFetch } from "./safe-fetch";

type AllAddressesCallback = (
  err: NodeJS.ErrnoException | null,
  addresses: dns.LookupAddress[],
) => void;

/** Exported for unit tests. */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 0);
      return;
    }

    if (
      addresses.length === 0 ||
      addresses.some(({ address }) => isPrivateIp(address))
    ) {
      callback(
        new Error(`${hostname} resolves to a disallowed IP address.`),
        "",
        0,
      );
      return;
    }

    // Newer Node versions call `lookup` with `all: true` (for example with
    // `autoSelectFamily`) and expect the full list back. The Node 18 types do
    // not know this form yet.
    if ((options as dns.LookupOptions).all) {
      (callback as unknown as AllAddressesCallback)(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

const agent = new Agent({ connect: { lookup: safeLookup } });

export const safeFetchNode = createSafeFetch({
  fetch: (url, init) =>
    undiciFetch(url, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: agent,
    }) as unknown as Promise<Response>,
  resolveHostnames: false,
});

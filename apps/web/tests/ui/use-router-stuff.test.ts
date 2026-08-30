// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fns shared with the next/navigation mock factory (hoisted above imports).
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => "/test",
  useSearchParams: () => mocks.searchParams,
}));

// `useRouterStuff` imports `AppRouterInstance` (type only) from this module; mock
// it defensively in case the transpiler emits a runtime import for it.
vi.mock("next/dist/shared/lib/app-router-context.shared-runtime", () => ({}));

// Import the hook directly from source (not the @dub/ui barrel) to keep the test
// light and avoid pulling the whole UI library into the test environment.
import { useRouterStuff } from "../../../../packages/ui/src/hooks/use-router-stuff";

/** Render the hook once and return its API (no effects involved here). */
function renderQueryParams() {
  let api: ReturnType<typeof useRouterStuff> | undefined;
  function Probe() {
    api = useRouterStuff();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  flushSync(() => createRoot(container).render(createElement(Probe)));
  if (!api) throw new Error("hook did not render");
  return api;
}

describe("useRouterStuff queryParams — shallow routing", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;
  let pushState: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.searchParams = new URLSearchParams();
    replaceState = vi.spyOn(window.history, "replaceState");
    pushState = vi.spyOn(window.history, "pushState");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // This is the invariant the search-perf fix depends on: a `shallow` write must
  // update the URL via the History API and must NOT trigger a router navigation
  // (which would re-render Server Components — a wasted RSC round-trip for our
  // client-fetched, SWR-keyed tables). SearchBoxPersisted relies on this.
  it("shallow + replace writes the URL via history.replaceState, never the router", () => {
    const { queryParams } = renderQueryParams();

    queryParams({
      set: { search: "foo" },
      del: "page",
      shallow: true,
      replace: true,
    });

    expect(replaceState).toHaveBeenCalledWith({}, "", "/test?search=foo");
    expect(pushState).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shallow without replace uses history.pushState (mirrors router.push)", () => {
    const { queryParams } = renderQueryParams();

    queryParams({ set: { search: "foo" }, shallow: true });

    expect(pushState).toHaveBeenCalledWith({}, "", "/test?search=foo");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("non-shallow falls back to a router navigation (the RSC round-trip we avoid for search)", () => {
    const { queryParams } = renderQueryParams();

    queryParams({ set: { search: "foo" } });

    expect(mocks.push).toHaveBeenCalledWith("/test?search=foo", {
      scroll: false,
    });
    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("no-ops when the resulting URL is unchanged (no router nav, no history write)", () => {
    mocks.searchParams = new URLSearchParams("search=foo");
    const { queryParams } = renderQueryParams();

    // `del` a param that isn't present → identical URL. This is the pagination
    // case: after a search clears `page`, a pagination sync re-issues del:page,
    // which must not fire a (same-URL) navigation / RSC round-trip.
    queryParams({ del: "page" });

    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });
});

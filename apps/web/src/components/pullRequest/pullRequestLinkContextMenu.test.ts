import { describe, expect, it } from "vite-plus/test";

import {
  openOnHostLabel,
  pullRequestLinkContextMenuItems,
  showPullRequestLinkContextMenu,
} from "./pullRequestLinkContextMenu";

describe("pull request link context menu", () => {
  it("offers the copy first and the host's own page after it", () => {
    expect(pullRequestLinkContextMenuItems("Open on GitHub")).toEqual([
      { id: "copy-link", label: "Copy link", icon: "copy" },
      { id: "open-external", label: "Open on GitHub" },
    ]);
  });

  it("leaves unlinking out until the caller says this number is the thread's own", () => {
    expect(pullRequestLinkContextMenuItems("Open on GitHub", false)).toHaveLength(2);
    expect(
      pullRequestLinkContextMenuItems("Open on GitHub", false).some(
        (item) => item.id === "unlink-from-thread",
      ),
    ).toBe(false);
  });

  it("puts unlinking last, behind a divider, so a misclick lands on copy instead", () => {
    const items = pullRequestLinkContextMenuItems("Open on GitHub", true);
    expect(items).toEqual([
      { id: "copy-link", label: "Copy link", icon: "copy" },
      { id: "open-external", label: "Open on GitHub" },
      { id: "unlink-from-thread", label: "Unlink from thread", separatorBefore: true },
    ]);
  });

  it("tells the unlink callback which url was acted on, so a stale menu can decline", async () => {
    const acted: string[] = [];
    // These suites run on node, so the desktop bridge the menu reaches for is stood up here
    // rather than in a DOM. Only `contextMenu.show` is exercised, and it answers from the bridge.
    const globals = globalThis as { window?: unknown };
    const previousWindow = globals.window;
    globals.window = { desktopBridge: { showContextMenu: async () => "unlink-from-thread" } };
    try {
      await showPullRequestLinkContextMenu({
        url: "https://github.com/pingdotgg/t3code/pull/23",
        openLabel: "Open on GitHub",
        position: { x: 0, y: 0 },
        unlinkFromThread: async (url) => {
          acted.push(url);
        },
      });
    } finally {
      globals.window = previousWindow;
    }
    expect(acted).toEqual(["https://github.com/pingdotgg/t3code/pull/23"]);
  });

  it("names every host it knows, and says nothing false about one it does not", () => {
    expect(openOnHostLabel("github")).toBe("Open on GitHub");
    expect(openOnHostLabel("gitlab")).toBe("Open on GitLab");
    expect(openOnHostLabel("bitbucket")).toBe("Open on Bitbucket");
    expect(openOnHostLabel("azure-devops")).toBe("Open on Azure DevOps");
    expect(openOnHostLabel("something-else")).toBe("Open on host");
  });
});

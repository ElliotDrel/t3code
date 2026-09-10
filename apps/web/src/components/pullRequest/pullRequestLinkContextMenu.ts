import type { ContextMenuItem } from "@t3tools/contracts";

import { writeTextToClipboard } from "~/hooks/useCopyToClipboard";
import { readLocalApi } from "~/localApi";

import { toastManager } from "../ui/toast";

export type PullRequestLinkContextMenuAction = "copy-link" | "open-external" | "unlink-from-thread";

/** Named for the host rather than "externally": the point is where you will land. */
export const OPEN_ON_HOST_LABELS: Partial<Record<string, string>> = {
  github: "Open on GitHub",
  gitlab: "Open on GitLab",
  bitbucket: "Open on Bitbucket",
  "azure-devops": "Open on Azure DevOps",
};

export const openOnHostLabel = (provider: string): string =>
  OPEN_ON_HOST_LABELS[provider] ?? "Open on host";

/**
 * Copy first: it is the reason to right-click a number rather than click it.
 *
 * Unlinking comes last, behind a divider, because it is the one item here that changes the thread
 * rather than the clipboard or the browser — and because a thread only settles on its own once a
 * link exists, so reaching for it is rare next to the two above it.
 */
export function pullRequestLinkContextMenuItems(
  openLabel: string,
  canUnlinkFromThread = false,
): readonly ContextMenuItem<PullRequestLinkContextMenuAction>[] {
  const items: ContextMenuItem<PullRequestLinkContextMenuAction>[] = [
    { id: "copy-link", label: "Copy link", icon: "copy" },
    { id: "open-external", label: openLabel },
  ];
  if (canUnlinkFromThread) {
    items.push({
      id: "unlink-from-thread",
      label: "Unlink from thread",
      separatorBefore: true,
    });
  }
  return items;
}

/**
 * The right-click on a change request's number. Everywhere else that number is written it is a
 * link, and the gesture that copies a link is the one hand reaches for — so without this the
 * platform's own edit menu opens over a control that has nothing to cut, paste or select.
 *
 * The host is named by the caller rather than guessed here: the same number belongs to GitHub,
 * GitLab, Bitbucket or Azure DevOps depending on where it was read, and the `url` the contract
 * carries is already whichever of them it came from.
 */
export async function showPullRequestLinkContextMenu({
  url,
  openLabel,
  position,
  unlinkFromThread,
}: {
  readonly url: string;
  readonly openLabel: string;
  readonly position: { readonly x: number; readonly y: number };
  /**
   * Absent where the number being right-clicked is not the one its thread is linked to — a pull
   * request read off a branch, a row on the list page, a server that does not record links at all.
   */
  readonly unlinkFromThread?: (() => Promise<void>) | null | undefined;
}): Promise<void> {
  const api = readLocalApi();
  if (!api) return;
  let action: PullRequestLinkContextMenuAction | null = null;
  try {
    action = await api.contextMenu.show(
      pullRequestLinkContextMenuItems(openLabel, unlinkFromThread != null),
      position,
    );
  } catch {
    // A menu that could not be shown has already cost the reader their right-click; there is
    // nothing to say about it that a second popup would not make worse.
    return;
  }
  try {
    if (action === "copy-link") await writeTextToClipboard(url, "link");
    else if (action === "open-external") await api.shell.openExternal(url);
    else if (action === "unlink-from-thread") await unlinkFromThread?.();
  } catch {
    toastManager.add({
      type: "error",
      title:
        action === "copy-link"
          ? "Could not copy the link"
          : action === "unlink-from-thread"
            ? "Could not unlink the pull request"
            : "Could not open the link",
    });
  }
}

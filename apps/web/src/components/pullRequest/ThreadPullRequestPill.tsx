import type { ScopedThreadRef } from "@t3tools/contracts";
import { useCallback, type MouseEvent as ReactMouseEvent } from "react";

import { cn } from "~/lib/utils";
import { useOpenPrLink } from "~/lib/openPullRequestLink";
import { useThreadShell } from "~/state/entities";

import {
  ChangeRequestStatusIcon,
  PrStatusTooltipContent,
  prStatusIndicator,
  useLinkedThreadPullRequest,
} from "../ThreadStatusIndicators";
import { buttonVariants } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { openOnHostLabel, showPullRequestLinkContextMenu } from "./pullRequestLinkContextMenu";
import { useUnlinkThreadPullRequest } from "./useUnlinkThreadPullRequest";

/**
 * The pull request a thread is linked to, sitting beside the git actions in the header.
 *
 * Only the link is shown here, never a pull request merely read off the thread's branch: this
 * chip exists because the link is otherwise invisible from the thread you are reading, and it is
 * the link — not the branch — that settles the thread once the pull request merges. It behaves
 * like the sidebar's number, down to the right-click that undoes it.
 */
export function ThreadPullRequestPill({ threadRef }: { readonly threadRef: ScopedThreadRef }) {
  const linkedPullRequest = useThreadShell(threadRef)?.linkedPullRequest ?? null;
  const linkedStatus = useLinkedThreadPullRequest(threadRef.environmentId, linkedPullRequest);
  const openPrLink = useOpenPrLink(threadRef);
  const unlinkThreadPullRequest = useUnlinkThreadPullRequest(threadRef);

  const url = linkedPullRequest?.url ?? null;
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (url !== null) openPrLink(event, url);
    },
    [openPrLink, url],
  );
  const handleContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (url === null) return;
      event.preventDefault();
      event.stopPropagation();
      void showPullRequestLinkContextMenu({
        url,
        openLabel: openOnHostLabel(linkedStatus?.sourceControlProvider.kind ?? ""),
        position: { x: event.clientX, y: event.clientY },
        unlinkFromThread: unlinkThreadPullRequest,
      });
    },
    [linkedStatus, unlinkThreadPullRequest, url],
  );

  if (linkedPullRequest === null || url === null) return null;

  // The number comes from the link itself, so the chip renders at once and only takes on its
  // open/merged/closed colour once the provider answers. Waiting for that would blink a control
  // in and out of the header on every thread switch.
  const status = prStatusIndicator(linkedStatus?.pr ?? null, linkedStatus?.sourceControlProvider);
  const label = `#${linkedPullRequest.number}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // A real link, so cmd/ctrl+click and middle-click still reach the host in a browser.
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={status?.tooltip ?? `Pull request ${label}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className={buttonVariants({
              variant: "outline",
              size: "xs",
              className: "ps-[8.5px] tabular-nums",
            })}
          />
        }
      >
        <ChangeRequestStatusIcon
          className={cn("size-3.5", status?.colorClass ?? "text-muted-foreground")}
        />
        <span className="ml-0.5">{label}</span>
      </TooltipTrigger>
      <TooltipPopup side="bottom">
        {status ? <PrStatusTooltipContent status={status} /> : `Pull request ${label}`}
      </TooltipPopup>
    </Tooltip>
  );
}

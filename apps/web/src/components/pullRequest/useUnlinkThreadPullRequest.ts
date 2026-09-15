import type { ScopedThreadRef } from "@t3tools/contracts";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { useCallback } from "react";

import { matchesLinkedPullRequestUrl } from "~/lib/openPullRequestLink";
import { readThreadShell, useServerConfigs } from "~/state/entities";
import { threadEnvironment } from "~/state/threads";
import { useAtomCommand } from "~/state/use-atom-command";

/**
 * Clears the pull request a thread is linked to, or null where this server cannot store the link
 * in the first place.
 *
 * Null is the answer a caller leaves the action out of its menu for: the link is what makes a
 * thread settle when its pull request merges, so offering to undo it on a server that never
 * recorded one would promise something nothing can honour.
 *
 * The returned function is given the URL the reader acted on, and drops the request when that is
 * no longer the link the thread holds. A context menu is open for as long as it takes to read it,
 * and in that time the agent can write a newer pull request link or another device can change the
 * thread — clearing whatever happens to be there by then would unlink something nobody chose.
 */
export function useUnlinkThreadPullRequest(
  threadRef: ScopedThreadRef | null | undefined,
): ((url: string) => Promise<void>) | null {
  const serverConfigs = useServerConfigs();
  const updateThreadMetadata = useAtomCommand(threadEnvironment.updateMetadata, {
    reportFailure: false,
  });
  const unlink = useCallback(
    async (url: string) => {
      if (threadRef == null) return;
      const current = readThreadShell(threadRef)?.linkedPullRequest;
      if (current == null || !matchesLinkedPullRequestUrl(current, url)) return;
      const result = await updateThreadMetadata({
        environmentId: threadRef.environmentId,
        input: { threadId: threadRef.threadId, linkedPullRequest: null },
      });
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        throw squashAtomCommandFailure(result);
      }
    },
    [threadRef, updateThreadMetadata],
  );

  if (threadRef == null) return null;
  return serverConfigs.get(threadRef.environmentId)?.environment.capabilities
    .threadPullRequestLinking === true
    ? unlink
    : null;
}

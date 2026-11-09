import { DeskShell } from "../../components/desk/DeskShell";
import type { ParentProps } from "solid-js";
import type { RouteDefinition } from "@solidjs/router";
import { getDeskUser } from "../../lib/desk/queries";

/** Desk pages: the sidebar frame around each. Print pages sit outside it. */
export default function Shell(props: ParentProps) {
  return <DeskShell>{props.children}</DeskShell>;
}

// Started with the page's own reads, not after them.
export const route = {
  preload: () => {
    void getDeskUser();
  },
} satisfies RouteDefinition;

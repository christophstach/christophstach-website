import { DeskShell } from "../../components/desk/DeskShell";
import type { ParentProps } from "solid-js";

/** Desk pages: the sidebar frame around each. Print pages sit outside it. */
export default function Shell(props: ParentProps) {
  return <DeskShell>{props.children}</DeskShell>;
}

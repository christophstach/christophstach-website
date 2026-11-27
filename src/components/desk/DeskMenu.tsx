import { For, createSignal, createUniqueId } from "solid-js";
import { IconDots } from "../icons";
import type { IconProps } from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskMenu.module.css";

/** One action in the menu; `danger` marks a destructive one. */
interface MenuAction {
  label: string;
  icon: (props: IconProps) => JSX.Element;
  run: () => unknown;
  danger?: boolean;
}

interface DeskMenuProps {
  actions: MenuAction[];
  label?: string;
}

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

/** A "…" button opening a list of actions, as a popover. */
export function DeskMenu(props: DeskMenuProps) {
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ top: "0px", left: "0px" });
  let button: HTMLButtonElement | undefined;
  let menu: HTMLDivElement | undefined;
  let initialFocus: "first" | "last" = "first";
  const label = () => props.label ?? "More actions";

  function menuItems(): HTMLButtonElement[] {
    if (menu === undefined) {
      return [];
    }

    const items: HTMLButtonElement[] = [];

    for (const node of menu.querySelectorAll('[role="menuitem"]')) {
      if (node instanceof HTMLButtonElement) {
        items.push(node);
      }
    }

    return items;
  }

  function focusItem(index: number) {
    const items = menuItems();

    if (items.length === 0) {
      return;
    }

    const wrapped = ((index % items.length) + items.length) % items.length;

    items[wrapped]?.focus();
  }

  // A popover sits in the top layer and closes on outside clicks and Escape by
  // itself; place it below its button, or above when there is not enough room.
  function handleToggle(event: ToggleEvent) {
    const isOpen = event.newState === "open";

    setOpen(isOpen);

    if (!isOpen) {
      initialFocus = "first";

      return;
    }

    const rect = button?.getBoundingClientRect();

    if (rect !== undefined) {
      const width = menu?.offsetWidth ?? 0;
      const height = menu?.offsetHeight ?? 0;
      const below = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
      const above = rect.top - MENU_GAP - VIEWPORT_MARGIN;
      const placeBelow = height <= below || below >= above;
      const top = placeBelow
        ? Math.max(
            VIEWPORT_MARGIN,
            Math.min(rect.bottom + MENU_GAP, window.innerHeight - height - VIEWPORT_MARGIN),
          )
        : Math.max(VIEWPORT_MARGIN, rect.top - MENU_GAP - height);
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN),
      );

      setPosition({ top: `${top}px`, left: `${left}px` });
    }

    const items = menuItems();
    const target = initialFocus === "last" ? items.length - 1 : 0;

    initialFocus = "first";
    focusItem(target);
  }

  function onTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      initialFocus = event.key === "ArrowUp" ? "last" : "first";

      if (open()) {
        focusItem(initialFocus === "last" ? menuItems().length - 1 : 0);
      } else {
        menu?.showPopover();
      }
    }
  }

  function onMenuKeyDown(event: KeyboardEvent) {
    const items = menuItems();
    const current = items.findIndex((item) => item === document.activeElement);

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        focusItem(current === -1 ? 0 : current + 1);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        focusItem(current === -1 ? items.length - 1 : current - 1);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusItem(0);
        break;
      }
      case "End": {
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      }
      case "Escape": {
        event.preventDefault();
        menu?.hidePopover();
        button?.focus();
        break;
      }
      case "Tab": {
        menu?.hidePopover();
        break;
      }
      default: {
        break;
      }
    }
  }

  function choose(action: MenuAction) {
    menu?.hidePopover();
    action.run();
  }

  return (
    <>
      <button
        ref={(element) => {
          button = element;
        }}
        type="button"
        class="icon-button"
        aria-label={label()}
        title={label()}
        aria-haspopup="menu"
        aria-expanded={open() ? "true" : "false"}
        aria-controls={id}
        popovertarget={id}
        onKeyDown={onTriggerKeyDown}
      >
        <IconDots size={20} />
      </button>

      <div
        id={id}
        ref={(element) => {
          menu = element;
        }}
        popover
        class={styles.menu}
        style={position()}
        onToggle={handleToggle}
      >
        <ul class={styles.menu__list} role="menu" aria-label={label()} onKeyDown={onMenuKeyDown}>
          <For each={props.actions}>
            {(action) => (
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  tabindex={-1}
                  class={[
                    styles.menu__item,
                    { [styles["menu__item--danger"] ?? ""]: action.danger === true },
                  ]}
                  onClick={() => {
                    choose(action);
                  }}
                >
                  <action.icon size={16} />
                  {action.label}
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </>
  );
}

export type { MenuAction };

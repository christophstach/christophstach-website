// Tabler icons (https://tabler.io/icons, MIT), their SVG paths inlined so no
// icon runtime ships. To add one, copy its path data from the Tabler set
// (e.g. @iconify-json/tabler icons.json, viewBox 24) into a TablerIcon.
import type { JSX } from "@solidjs/web";

interface IconProps {
  size?: number;
  class?: string;
}

function TablerIcon(props: IconProps & { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      class={props.class}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d={props.path}
      />
    </svg>
  );
}

export function IconSun(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0m-5 0h1m8-9v1m8 8h1m-9 8v1M5.6 5.6l.7.7m12.1-.7l-.7.7m0 11.4l.7.7m-12.1-.7l-.7.7"
    />
  );
}

export function IconMoon(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z" />;
}

export function IconDeviceDesktop(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm4 15h10m-8-4v4m6-4v4"
    />
  );
}

export function IconBrandLinkedin(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M8 11v5m0-8v.01M12 16v-5m4 5v-3a2 2 0 1 0-4 0M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"
    />
  );
}

export function IconBrandGithub(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2c2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2a4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6c-.6.6-.6 1.2-.5 2V21"
    />
  );
}

export function IconArrowRight(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="M5 12h14m-6 6l6-6m-6-6l6 6" />;
}

export type { IconProps };

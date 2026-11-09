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

export type { IconProps };

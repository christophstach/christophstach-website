// Tabler icons (https://tabler.io/icons, MIT), their SVG paths inlined so no
// icon runtime ships. To add one, copy its path data (viewBox 24, stroke
// icons) into a TablerIcon; several paths join into one d attribute.
import type { JSX } from "@solidjs/web";

interface IconProps {
  size?: number | undefined;
  class?: string | undefined;
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

export function IconDownload(props: IconProps): JSX.Element {
  return (
    <TablerIcon {...props} path="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5l5-5m-5-7v12" />
  );
}

export function IconBriefcase(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm5-2V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-4 5v.01M3 13a20 20 0 0 0 18 0"
    />
  );
}

export function IconSchool(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="M22 9L12 5L2 9l10 4zv6M6 10.6V16a6 3 0 0 0 12 0v-5.4" />;
}

export function IconFileTypePdf(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M14 3v4a1 1 0 0 0 1 1h4M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"
    />
  );
}

export function IconChevronDown(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="m6 9l6 6l6-6" />;
}

export function IconChevronUp(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="m6 15l6-6l6 6" />;
}

export function IconCopy(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M7 9.667A2.667 2.667 0 0 1 9.667 7h8.666A2.667 2.667 0 0 1 21 9.667v8.666A2.667 2.667 0 0 1 18.333 21H9.667A2.667 2.667 0 0 1 7 18.333z M4.012 16.737A2 2 0 0 1 3 15V5c0-1.1.9-2 2-2h10c.75 0 1.158.385 1.5 1"
    />
  );
}

export function IconDots(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
    />
  );
}

export function IconFileCv(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M14 3v4a1 1 0 0 0 1 1h4 M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2 M11 12.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0m2-4.5l1.5 6l1.5-6"
    />
  );
}

export function IconFileDownload(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M14 3v4a1 1 0 0 0 1 1h4 M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2m-5-4v-6 M9.5 14.5L12 17l2.5-2.5"
    />
  );
}

export function IconFolders(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M9 3h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 M17 16v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"
    />
  );
}

export function IconGripVertical(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M8 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m0 7a1 1 0 1 0 2 0a1 1 0 1 0-2 0m0 7a1 1 0 1 0 2 0a1 1 0 1 0-2 0m6-14a1 1 0 1 0 2 0a1 1 0 1 0-2 0m0 7a1 1 0 1 0 2 0a1 1 0 1 0-2 0m0 7a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
    />
  );
}

export function IconId(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z M7 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0m8-2h2m-2 4h2M7 16h10"
    />
  );
}

export function IconLayoutDashboard(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m0 12h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1m10-4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1m0-8h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1"
    />
  );
}

export function IconLayoutSidebarLeftCollapse(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm5-2v16 m15 10l-2 2l2 2"
    />
  );
}

export function IconLayoutSidebarLeftExpand(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm5-2v16 m14 10l2 2l-2 2"
    />
  );
}

export function IconLogout(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2 M9 12h12l-3-3m0 6l3-3"
    />
  );
}

export function IconMail(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z m3 7l9 6l9-6"
    />
  );
}

export function IconPlus(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="M12 5v14m-7-7h14" />;
}

export function IconStack(props: IconProps): JSX.Element {
  return <TablerIcon {...props} path="M12 4L4 8l8 4l8-4l-8-4M4 12l8 4l8-4M4 16l8 4l8-4" />;
}

export function IconTools(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 21h4L20 8a1.5 1.5 0 0 0-4-4L3 17zM14.5 5.5l4 4 M12 8L7 3L3 7l5 5M7 8L5.5 9.5M16 12l5 5l-4 4l-5-5m4 1l-1.5 1.5"
    />
  );
}

export function IconTrash(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
    />
  );
}

export function IconWorld(props: IconProps): JSX.Element {
  return (
    <TablerIcon
      {...props}
      path="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m.6-3h16.8M3.6 15h16.8 M11.5 3a17 17 0 0 0 0 18m1-18a17 17 0 0 1 0 18"
    />
  );
}

export type { IconProps };

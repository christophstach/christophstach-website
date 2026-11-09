import {
  IconBriefcase,
  IconFileCv,
  IconFolders,
  IconId,
  IconLayoutDashboard,
  IconMail,
  IconSchool,
  IconTools,
} from "../components/icons";
import type { IconProps } from "../components/icons";
import type { JSX } from "@solidjs/web";

/** A link of the private desk's sidebar. */
export interface DeskLink {
  to: string;
  label: string;
  /** Shown alone when the sidebar is collapsed. */
  icon: (props: IconProps) => JSX.Element;
}

export const deskSections: DeskLink[] = [
  { to: "/desk", label: "overview", icon: IconLayoutDashboard },
  { to: "/desk/cv", label: "cv", icon: IconFileCv },
  { to: "/desk/cover-letters", label: "cover-letters", icon: IconMail },
];

/** Under "cv": the content the variants pick from. */
export const deskContentLinks: DeskLink[] = [
  { to: "/desk/cv/profile", label: "profile", icon: IconId },
  { to: "/desk/cv/experience", label: "experience", icon: IconBriefcase },
  { to: "/desk/cv/education", label: "education", icon: IconSchool },
  { to: "/desk/cv/skills", label: "skills", icon: IconTools },
  { to: "/desk/cv/projects", label: "projects", icon: IconFolders },
];

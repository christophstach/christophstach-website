import {
  IconBriefcase,
  IconBuilding,
  IconFileCv,
  IconFolders,
  IconId,
  IconInbox,
  IconLayoutDashboard,
  IconMail,
  IconRss,
  IconSchool,
  IconSend,
  IconStack,
  IconTools,
} from "../components/icons";
import type { IconProps } from "../components/icons";
import type { JSX } from "@solidjs/web";
import { paths } from "../router";

/** A link of the private desk's sidebar. */
export interface DeskLink {
  to: string;
  label: string;
  /** Shown alone when the sidebar is collapsed. */
  icon: (props: IconProps) => JSX.Element;
}

/** A sidebar section; its pages show under it while the sidebar is open. */
export interface DeskSection extends DeskLink {
  pages?: DeskLink[];
}

/** Under "content": what every CV picks from, with what the content page says of each. */
export const deskContentLinks: (DeskLink & { hint: string })[] = [
  {
    to: paths.desk.content.profile(),
    label: "profile",
    icon: IconId,
    hint: "Name, contact and links: the header of every CV and letter.",
  },
  {
    to: paths.desk.content.experience(),
    label: "experience",
    icon: IconBriefcase,
    hint: "Jobs, with the bullets the CVs pick from.",
  },
  {
    to: paths.desk.content.education(),
    label: "education",
    icon: IconSchool,
    hint: "Degrees, with the bullets the CVs pick from.",
  },
  {
    to: paths.desk.content.skills(),
    label: "skills",
    icon: IconTools,
    hint: "Skill groups: the home page shows all, the CVs pick which they print.",
  },
  {
    to: paths.desk.content.projects(),
    label: "projects",
    icon: IconFolders,
    hint: "Projects for /curriculum, picked by the website CV.",
  },
];

export const deskSections: DeskSection[] = [
  { to: paths.desk(), label: "overview", icon: IconLayoutDashboard },
  {
    to: paths.desk.applications(),
    label: "applications",
    icon: IconSend,
    pages: [
      { to: paths.desk.postings(), label: "postings", icon: IconInbox },
      { to: paths.desk.companies(), label: "companies", icon: IconBuilding },
      { to: paths.desk["cover-letters"](), label: "cover-letters", icon: IconMail },
      { to: paths.desk.collectors(), label: "collectors", icon: IconRss },
    ],
  },
  { to: paths.desk.cvs(), label: "cvs", icon: IconFileCv },
  { to: paths.desk.content(), label: "content", icon: IconStack, pages: deskContentLinks },
];

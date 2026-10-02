/** A section of the private desk, listed in the desk sidebar. */
export interface DeskSection {
  to: string;
  label: string;
  /** Tabler icon, shown alone when the sidebar is collapsed. */
  icon: string;
}

export const deskSections: DeskSection[] = [
  { to: "/desk", label: "overview", icon: "tabler:layout-dashboard" },
];

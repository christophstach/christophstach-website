/** A section of the private desk, listed in the desk sidebar. */
export interface DeskSection {
  to: string;
  label: string;
}

export const deskSections: DeskSection[] = [{ to: "/desk", label: "overview" }];

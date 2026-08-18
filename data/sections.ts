/**
 * Single definition of the page's section spine.
 *
 * The navigation, the progress rail and the page itself all read from this,
 * so a section can never appear in the nav without existing on the page — or
 * vice versa.
 */
export const sections = [
  { id: "work", label: "Selected work", nav: "Work" },
  { id: "projects", label: "Project explorer", nav: null },
  { id: "github", label: "GitHub", nav: "GitHub" },
  { id: "stack", label: "Stack", nav: "Stack" },
  { id: "security", label: "Security", nav: "Security" },
  { id: "about", label: "About", nav: "About" },
  { id: "contact", label: "Contact", nav: null },
] as const;

export type SectionId = (typeof sections)[number]["id"];

/** Sections that appear as links in the primary navigation. */
export const navSections = sections.filter(
  (section): section is (typeof sections)[number] & { nav: string } =>
    section.nav !== null,
);

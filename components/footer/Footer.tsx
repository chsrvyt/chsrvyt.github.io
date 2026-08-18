import { profile } from "@/data/profile";

const links = [
  { label: "GitHub", href: profile.links.github, external: true },
  { label: "LinkedIn", href: profile.links.linkedin, external: true },
  { label: "Email", href: profile.links.mailto, external: false },
];

export function Footer() {
  // Rendered at request time, so this never silently claims the wrong year.
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-chalk/8 px-6 py-14 sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xl font-medium uppercase tracking-wide text-chalk">
            {profile.name}
          </p>
          <p className="mt-2 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-dim">
            {profile.disciplines.join(" • ")}
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-7">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="link-wipe font-mono text-[0.66rem] uppercase tracking-[0.16em] text-mute transition-colors hover:text-chalk"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col gap-3 border-t border-chalk/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
          © {year} {profile.name}
        </p>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
          Project data from the GitHub API
        </p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { featured } from "@/data/featured";
import { PreviewImage } from "@/components/projects/PreviewImage";
import { ActionLink } from "@/components/ui/ActionLink";
import { Markdown } from "@/components/ui/Markdown";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { getRepositories, findBySlug } from "@/lib/github";
import { getReadme } from "@/lib/github/readme";
import { STATUS_LABELS, slugify } from "@/lib/github/normalize";
import { CATEGORY_LABELS } from "@/lib/github/types";
import { compactNumber, formatDate } from "@/lib/utils/format";

/*
 * A static export cannot render a path it was not told about, so every project
 * route is enumerated below and `dynamicParams` is off: a slug that is not in
 * the list is a 404, not an on-demand render.
 */
export const dynamicParams = false;

/**
 * Case-study route.
 *
 * Every section is repository-derived: the overview is GitHub's description,
 * the facts panel is repository metadata, and the long-form content is the
 * project's own README. There is no hand-written "problem / approach /
 * challenges" narrative, because inventing one would mean asserting things
 * about a codebase that nothing in the API supports.
 */

export async function generateStaticParams() {
  try {
    const repos = await getRepositories();
    return repos.value.map((project) => ({ slug: project.slug }));
  } catch {
    /*
     * GitHub unreachable at build time. Fall back to the curated set so the
     * flagship case studies still exist — a build that silently ships zero
     * project pages is worse than one that ships five.
     */
    return featured.map((entry) => ({ slug: slugify(entry.repo) }));
  }
}

async function loadProject(slug: string) {
  const repos = await getRepositories();
  return findBySlug(repos.value, slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const project = await loadProject(slug);
    if (!project) return { title: "Project not found" };

    const description =
      project.summary ??
      `${project.title} — a public repository by Sarvesh Chonde on GitHub.`;

    return {
      title: project.title,
      description,
      alternates: { canonical: `/projects/${project.slug}` },
      openGraph: {
        title: `${project.title} | Sarvesh Chonde`,
        description,
        images: [{ url: project.previewImage, width: 1280, height: 640 }],
      },
    };
  } catch {
    // Metadata must never be the reason a page 500s.
    return { title: "Project" };
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await loadProject(slug);

  if (!project) notFound();

  // A missing or unreachable README is not a page failure.
  const readme = await getReadme(project.repo)
    .then((result) => result.value)
    .catch(() => null);

  const accent = project.accent ?? "#10b981";

  return (
    <article className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-32 pt-36 sm:px-10 sm:pt-44">
      <Link
        href="/#work"
        className="link-wipe font-mono text-[0.66rem] uppercase tracking-[0.18em] text-mute transition-colors hover:text-chalk"
      >
        <span aria-hidden="true">← </span>All work
      </Link>

      {/* ---------------- header ---------------- */}
      <header className="mt-10">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {project.categories.map((category) => (
            <li
              key={category}
              className="font-mono text-[0.64rem] uppercase tracking-[0.18em]"
              style={{ color: accent }}
            >
              {CATEGORY_LABELS[category]}
            </li>
          ))}
        </ul>

        <h1 className="mt-5 text-headline font-medium uppercase text-chalk">
          {project.title}
        </h1>

        {project.summary ? (
          <p className="mt-7 max-w-2xl text-lede text-bone">{project.summary}</p>
        ) : (
          <p className="mt-7 max-w-2xl text-lede text-dim">
            This repository has no description on GitHub.
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <ActionLink href={project.url} variant="solid" external>
            Source code
          </ActionLink>
          {project.homepage ? (
            <ActionLink href={project.homepage} variant="outline" external>
              Live demo
            </ActionLink>
          ) : null}
        </div>
      </header>

      {/* ---------------- preview ---------------- */}
      <div className="relative mt-16 overflow-hidden border border-chalk/10 bg-ink">
        <PreviewImage
          src={project.previewImage}
          alt={`GitHub social preview card for ${project.fullName}`}
          repo={project.repo}
          language={project.primaryLanguage}
          accent={project.accent}
          sizes="(max-width: 1152px) 100vw, 1152px"
          priority
        />
      </div>

      {/* ---------------- repository facts ---------------- */}
      <section aria-labelledby="facts-heading" className="mt-20">
        <h2 id="facts-heading" className="eyebrow mb-8 text-bone">
          Repository
        </h2>

        <dl className="grid grid-cols-2 gap-px border border-chalk/8 bg-chalk/8 sm:grid-cols-3 lg:grid-cols-4">
          <Fact label="Status" value={STATUS_LABELS[project.status]} />
          <Fact label="Language" value={project.primaryLanguage ?? "—"} />
          <Fact label="Stars" value={compactNumber(project.stars)} />
          <Fact label="Forks" value={compactNumber(project.forks)} />
          <Fact label="Open issues" value={String(project.openIssues)} />
          <Fact label="Created" value={formatDate(project.createdAt)} />
          <Fact
            label="Last push"
            value={<RelativeTime iso={project.pushedAt} />}
          />
          <Fact label="Repository" value={project.fullName} />
        </dl>

        {project.topics.length > 0 ? (
          <div className="mt-8">
            <h3 className="eyebrow mb-4 text-bone">Topics</h3>
            <ul className="flex flex-wrap gap-2">
              {project.topics.map((topic) => (
                <li
                  key={topic}
                  className="border border-chalk/10 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* ---------------- README ---------------- */}
      <section aria-labelledby="readme-heading" className="mt-20">
        <h2 id="readme-heading" className="eyebrow mb-8 text-bone">
          From the repository README
        </h2>

        {readme ? (
          <div className="max-w-3xl">
            <Markdown source={readme.text} />
            {readme.truncated ? (
              <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
                README truncated ·{" "}
                <a
                  href={readme.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-wipe text-signal"
                >
                  read it on GitHub
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="max-w-2xl text-mute">
            This repository does not have a README yet.
          </p>
        )}
      </section>

      <p className="mt-20 hairline pt-6 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.16em] text-dim">
        All content on this page is read from the repository via the GitHub API
      </p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-void px-5 py-5">
      <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-dim">
        {label}
      </dt>
      <dd className="mt-2 break-words font-mono text-[0.72rem] text-bone">
        {value}
      </dd>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { RepoGlyph } from "@/components/projects/RepoGlyph";

/**
 * GitHub's social preview card, with a local fallback.
 *
 * `unoptimized` is deliberate. Routing this through Next's image optimizer
 * means the *server* fetches every card, and `opengraph.githubassets.com`
 * answers 429 when several arrive together. Letting the browser fetch it
 * directly spreads the requests, uses the visitor's HTTP cache, and keeps the
 * server off that endpoint's rate limit. The host is allow-listed in the CSP.
 *
 * If the fetch fails anyway — 429, offline, repository made private — the
 * generated glyph takes over, so the layout never shows a broken image.
 */
export function PreviewImage({
  src,
  alt,
  repo,
  language,
  accent,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  repo: string;
  language: string | null;
  accent?: string | null;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <RepoGlyph
        repo={repo}
        language={language}
        accent={accent}
        className="aspect-[2/1] h-auto w-full"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1280}
      height={640}
      sizes={sizes}
      unoptimized
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className="h-auto w-full"
    />
  );
}

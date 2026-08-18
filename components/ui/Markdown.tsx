import { Fragment } from "react";

/**
 * Minimal Markdown renderer for repository READMEs.
 *
 * Threat model first: a README is third-party content — it can contain raw
 * HTML, `javascript:` links, data URIs and anything else the author typed.
 * This renderer never produces an HTML string and never touches
 * `dangerouslySetInnerHTML`. It parses the source into typed tokens and emits
 * React elements, so injected markup is impossible by construction rather than
 * by sanitisation. Link hrefs are additionally restricted to http(s) and
 * mailto.
 *
 * Supported subset, deliberately small: headings, paragraphs, unordered and
 * ordered lists, fenced code blocks, blockquotes, horizontal rules, and the
 * inline forms `code`, **bold**, *italic* and [text](url). Everything else
 * degrades to plain text, which is the correct failure mode for a README
 * preview.
 */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; language: string | null; text: string }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

/**
 * Removes HTML tags from prose.
 *
 * READMEs routinely embed raw HTML — `<img>` badges, `<div align="center">`,
 * `<br>`. None of it is in the supported subset, so it was rendering as
 * literal, escaped tag text: safe, but it looked broken. Deleting the tags and
 * keeping their text content is the better failure mode.
 *
 * This is a presentation choice, not the security boundary. The security
 * boundary is that this file emits React elements and never an HTML string, so
 * a tag that slipped through here still could not execute.
 *
 * Never applied inside fenced code, where markup is the point.
 */
function stripTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, "").replace(/\s{2,}/g, " ").trim();
}

const FENCE = /^```(\w*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const UNORDERED = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^\s*([-*_])\s*(\1\s*){2,}$/;

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!;

    // --- fenced code ---
    const fence = FENCE.exec(line);
    if (fence) {
      const language = fence[1] || null;
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE.test(lines[index]!)) {
        body.push(lines[index]!);
        index += 1;
      }
      index += 1; // closing fence
      blocks.push({ kind: "code", language, text: body.join("\n") });
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const depth = heading[1]!.length;
      blocks.push({
        // README h1 is usually the project name, which the page already shows.
        // Everything is demoted so the page keeps one h1.
        kind: "heading",
        level: depth <= 1 ? 1 : depth === 2 ? 2 : 3,
        text: stripTags(heading[2]!),
      });
      index += 1;
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      const body: string[] = [quote[1]!];
      index += 1;
      while (index < lines.length && QUOTE.test(lines[index]!)) {
        body.push(QUOTE.exec(lines[index]!)![1]!);
        index += 1;
      }
      blocks.push({ kind: "quote", text: stripTags(body.join(" ")) });
      continue;
    }

    if (UNORDERED.test(line) || ORDERED.test(line)) {
      const ordered = !UNORDERED.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index]!;
        const match = ordered ? ORDERED.exec(current) : UNORDERED.exec(current);
        if (!match) break;
        const item = stripTags(match[1]!);
        if (item) items.push(item);
        index += 1;
      }
      if (items.length > 0) blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // --- paragraph: consume until a blank line or a new block starts ---
    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index]!;
      if (
        !current.trim() ||
        FENCE.test(current) ||
        HEADING.test(current) ||
        UNORDERED.test(current) ||
        ORDERED.test(current) ||
        QUOTE.test(current) ||
        RULE.test(current)
      ) {
        break;
      }
      paragraph.push(current.trim());
      index += 1;
    }
    const text = stripTags(paragraph.join(" "));
    // A paragraph that was nothing but an <img> badge leaves nothing behind.
    if (text) blocks.push({ kind: "paragraph", text });
  }

  return blocks;
}

/** Only these schemes may become an href. Everything else renders as text. */
function safeHref(raw: string): string | null {
  const value = raw.trim();
  try {
    // Relative URLs in a README point at the repo, not at this site — drop them.
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const id = `${keyPrefix}-${key++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={id}
          className="rounded-sm border border-chalk/10 bg-abyss px-1.5 py-0.5 font-mono text-[0.85em] text-signal-bright"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={id} className="font-medium text-chalk">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={id} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const label = linkMatch?.[1] ?? token;
      const href = linkMatch ? safeHref(linkMatch[2]!) : null;

      if (href) {
        nodes.push(
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="link-wipe text-signal"
          >
            {label}
          </a>,
        );
      } else {
        // Rejected scheme or relative path — keep the words, drop the link.
        nodes.push(label);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source);

  return (
    <div className="flex flex-col gap-6 leading-relaxed text-mute">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.kind) {
          case "heading": {
            const className =
              block.level === 1
                ? "mt-6 text-2xl font-medium text-chalk"
                : block.level === 2
                  ? "mt-4 text-xl font-medium text-chalk"
                  : "mt-2 text-base font-medium text-bone";
            // Always h3+ so the page's own h1/h2 hierarchy stays intact.
            const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
            return (
              <Tag key={key} className={className}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }

          case "paragraph":
            return <p key={key}>{renderInline(block.text, key)}</p>;

          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={key}
                className={`flex list-outside flex-col gap-2 pl-5 ${
                  block.ordered ? "list-decimal" : "list-disc"
                } marker:text-faint`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </Tag>
            );
          }

          case "code":
            return (
              <pre
                key={key}
                className="overflow-x-auto border border-chalk/10 bg-abyss p-4"
              >
                <code className="font-mono text-[0.78rem] leading-relaxed text-bone">
                  {block.text}
                </code>
              </pre>
            );

          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l border-signal/50 pl-5 text-bone"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );

          case "rule":
            return <hr key={key} className="border-chalk/10" />;

          default:
            return <Fragment key={key} />;
        }
      })}
    </div>
  );
}

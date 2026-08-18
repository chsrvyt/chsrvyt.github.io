import { cn } from "@/lib/utils/cn";

/**
 * Shared section shell.
 *
 * Every major band of the page uses this so the editorial rhythm — hairline
 * rule, numbered eyebrow, generous top margin — is identical throughout and
 * lives in exactly one file.
 */
export function Section({
  id,
  index,
  eyebrow,
  title,
  intro,
  className,
  containerClassName,
  children,
  align = "left",
}: {
  id: string;
  /** Editorial number, e.g. "01". Rendered beside the eyebrow. */
  index?: string;
  eyebrow: string;
  title?: React.ReactNode;
  intro?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
  align?: "left" | "wide";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("relative z-10 scroll-mt-24 py-24 sm:py-32 lg:py-40", className)}
    >
      <div
        className={cn(
          "mx-auto w-full px-6 sm:px-10",
          align === "wide" ? "max-w-[110rem]" : "max-w-7xl",
          containerClassName,
        )}
      >
        <header className="mb-14 sm:mb-20">
          <div
            data-anim="fade"
            className="hairline flex items-baseline gap-4 pt-5 sm:gap-6"
          >
            {index ? (
              <span className="font-mono text-[0.68rem] tracking-[0.2em] text-signal">
                {index}
              </span>
            ) : null}
            <span className="eyebrow">{eyebrow}</span>
          </div>

          {title ? (
            <h2
              id={`${id}-heading`}
              data-anim="up"
              className="mt-7 max-w-4xl text-headline font-medium text-chalk"
            >
              {title}
            </h2>
          ) : (
            <span id={`${id}-heading`} className="sr-only">
              {eyebrow}
            </span>
          )}

          {intro ? (
            <div
              data-anim="up"
              className="mt-6 max-w-2xl text-lede text-mute"
            >
              {intro}
            </div>
          ) : null}
        </header>

        {children}
      </div>
    </section>
  );
}

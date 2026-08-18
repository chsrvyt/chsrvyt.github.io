import { cn } from "@/lib/utils/cn";

/**
 * The site's primary control.
 *
 * Renders a real anchor — magnetism, hover motion and the custom cursor are
 * layered on top of working link semantics, never in place of them. It is
 * keyboard focusable, middle-clickable and works with JavaScript off.
 *
 * `data-magnetic` is picked up by MotionProvider; `data-magnetic-label`
 * marks the part that trails slightly further.
 */
export function ActionLink({
  href,
  children,
  variant = "solid",
  external = false,
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline" | "ghost";
  external?: boolean;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">) {
  const styles = {
    solid:
      "bg-signal text-void border-signal hover:bg-signal-bright hover:border-signal-bright",
    outline:
      "border-chalk/15 text-chalk hover:border-signal/60 hover:text-signal-bright",
    ghost: "border-transparent text-mute hover:text-chalk",
  }[variant];

  return (
    <a
      href={href}
      data-magnetic
      // `noopener` blocks window.opener access from the opened tab; `noreferrer`
      // keeps the referring URL out of the destination's logs.
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex items-center gap-2.5 border px-6 py-3.5",
        "font-mono text-[0.7rem] uppercase tracking-[0.16em]",
        "transition-colors duration-300 will-change-transform",
        styles,
        className,
      )}
      {...rest}
    >
      <span data-magnetic-label className="inline-flex items-center gap-2.5">
        {children}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" strokeLinecap="square" />
        </svg>
      </span>
      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
    </a>
  );
}

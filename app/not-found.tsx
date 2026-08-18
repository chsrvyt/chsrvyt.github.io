import Link from "next/link";

export const metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-6 py-32 sm:px-10">
      <p className="eyebrow text-signal">404</p>
      <h1 className="mt-6 text-headline font-medium uppercase text-chalk">
        No such page
      </h1>
      <p className="mt-6 max-w-lg text-lede text-mute">
        That route doesn&rsquo;t exist. If you followed a project link, the
        repository may have been renamed or made private on GitHub.
      </p>
      <Link
        href="/"
        className="link-wipe mt-10 w-fit font-mono text-[0.68rem] uppercase tracking-[0.18em] text-signal"
      >
        <span aria-hidden="true">← </span>Back to the portfolio
      </Link>
    </div>
  );
}

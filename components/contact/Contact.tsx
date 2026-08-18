import { profile } from "@/data/profile";
import { ActionLink } from "@/components/ui/ActionLink";

/**
 * Contact band.
 *
 * Three real destinations and no form. A contact form here would need a mail
 * transport, spam handling and a place to store submissions — three more
 * failure modes than a mailto link, for no gain on a personal site.
 */
export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative z-10 scroll-mt-24 py-28 sm:py-36"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <div data-anim="fade" className="hairline flex items-baseline gap-4 pt-5 sm:gap-6">
          <span className="font-mono text-[0.68rem] tracking-[0.2em] text-signal">07</span>
          <span className="eyebrow">Contact</span>
        </div>

        <h2
          id="contact-heading"
          data-anim="up"
          className="mt-8 max-w-4xl text-headline font-medium uppercase text-chalk"
        >
          Let&rsquo;s build something
        </h2>

        <p data-anim="up" className="mt-7 max-w-xl text-lede text-mute">
          Have a technical idea, collaboration or project in mind? The fastest
          way to reach me is email.
        </p>

        <div data-anim="up" className="mt-12 flex flex-wrap items-center gap-3">
          <ActionLink href={profile.links.mailto} variant="solid">
            Email
          </ActionLink>
          <ActionLink href={profile.links.linkedin} variant="outline" external>
            LinkedIn
          </ActionLink>
          <ActionLink href={profile.links.github} variant="outline" external>
            GitHub
          </ActionLink>
        </div>

        <p
          data-anim="fade"
          className="mt-10 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim"
        >
          {profile.links.email}
        </p>
      </div>
    </section>
  );
}

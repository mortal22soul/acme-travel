import Image from "next/image";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import acme from "@/app/assets/acme.png";
import logo from "@/app/assets/acme-corp-logomark.svg";

export default function Hero() {
  return <section className="px-2 pt-2 pb-8 lg:pb-28">
    <div className="relative mx-auto grid max-w-[1250px]">
      <div className="hero-photo relative min-h-[21rem] overflow-hidden rounded-3xl sm:aspect-video">
        <Image src={acme} alt="" fill priority fetchPriority="high" sizes="(min-width: 1266px) 1250px, 100vw"
          className="scale-[1.02] object-cover opacity-75 blur-sm" />
        <div className="absolute inset-0 bg-background/40 lg:bg-background/25" />
      </div>
      <div className="hero-copy flex max-w-full flex-col items-center gap-3 px-4 py-6 text-center sm:px-8 lg:translate-y-12">
        <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">
          Let the Journey Inspire You.
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/destinations" className="action px-5 py-3 text-sm motion-safe:transition-transform motion-safe:hover:scale-105">
            Book a Trip Now
          </Link>
          <Link href="/about" aria-label="About ACME Travel" className="brand-mark flex size-11 items-center justify-center rounded-full border shadow-sm travel-tint-border">
            <Image src={logo} alt="" width={20} height={20} />
          </Link>
        </div>
        <Link href="/tour-guides" className="secondary-action min-h-9 border-0 bg-transparent py-1 text-sm">
          Know More <IconArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>;
}

import Image from "next/image";
import Link from "next/link";
import logo from "@/app/assets/acme-corp.svg";

const linkGroups = [
  { title: "Company", links: [["About us", "/about"], ["Tour guides", "/tour-guides"], ["Packages", "/packages"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Blog", "/blog"], ["Destinations", "/destinations"], ["Travel tips", "/travel-tips"], ["FAQs", "/faqs"]] },
  { title: "Support", links: [["Customer support", "/support"], ["Terms & conditions", "/terms"], ["Privacy policy", "/privacy"]] },
] as const;

export default function Footer() {
  return <footer className="travel-surface border-t px-4 backdrop-blur sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl py-12">
      <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs space-y-4"><Image src={logo} alt="ACME Travel" className="h-10 w-auto" /><p className="text-sm leading-relaxed text-muted-foreground">Thoughtfully planned journeys for curious travelers.</p><p className="text-sm font-medium text-accent-foreground">Life is short. Travel more.</p></div>
        {linkGroups.map((group) => <div key={group.title}><h2 className="font-semibold text-foreground">{group.title}</h2><ul className="mt-4 space-y-2.5">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-muted-foreground transition hover:text-primary hover:underline">{label}</Link></li>)}</ul></div>)}
      </div>
      <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} ACME Travel. All rights reserved.</div>
    </div>
  </footer>;
}

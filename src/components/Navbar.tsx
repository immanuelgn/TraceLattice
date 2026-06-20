"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Clock3, GitCompareArrows, Info, Menu, Radar, Scale, ShieldCheck, X } from "lucide-react";
import { BrandMark } from "./BrandMark";

const links = [
  [Radar, "Scan", "/"],
  [GitCompareArrows, "Compare", "/compare"],
  [Clock3, "Recent", "/recent"],
  [Scale, "Methodology", "/methodology"],
  [ShieldCheck, "Ethics", "/ethics"],
  [Info, "About", "/about"],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="nav-shell">
      <nav className="container nav" aria-label="Primary navigation">
        <Link href="/" aria-label="TraceLattice home"><BrandMark /></Link>
        <p className="nav-caption">Public web posture</p>
        <div className="nav-links">
          {links.map(([Icon, label, href]) => <Link className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href} href={href}><Icon size={17} /><span>{label}</span></Link>)}
        </div>
        <div className="nav-status"><span />Scanner online</div>
        <button className="icon-button mobile-menu" type="button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        {open && (
          <div className="mobile-nav" id="mobile-navigation">
            {links.map(([Icon, label, href]) => <Link className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href} href={href} onClick={() => setOpen(false)}><Icon size={17} /><span>{label}</span></Link>)}
          </div>
        )}
      </nav>
    </header>
  );
}

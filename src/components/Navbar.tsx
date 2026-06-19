"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "./BrandMark";

const links = [
  ["Scan", "/"],
  ["Compare", "/compare"],
  ["Recent", "/recent"],
  ["Methodology", "/methodology"],
  ["Ethics", "/ethics"],
  ["About", "/about"],
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="nav-shell">
      <nav className="container nav" aria-label="Primary navigation">
        <Link href="/" aria-label="TraceLattice home"><BrandMark /></Link>
        <div className="nav-links">
          {links.map(([label, href]) => <Link className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href} href={href}>{label}</Link>)}
        </div>
        <button className="icon-button mobile-menu" type="button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        {open && (
          <div className="mobile-nav" id="mobile-navigation">
            {links.map(([label, href]) => <Link className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined} key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          </div>
        )}
      </nav>
    </header>
  );
}

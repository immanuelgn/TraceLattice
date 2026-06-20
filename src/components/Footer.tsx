import Link from "next/link";
import { BriefcaseBusiness, Code2 } from "lucide-react";
import { BrandMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>Defensive static intelligence for the public web.</p>
        </div>
        <div className="footer-links">
          <Link href="/methodology">Methodology</Link>
          <Link href="/ethics">Security & ethics</Link>
          <Link href="/about">About</Link>
        </div>
        <div className="footer-socials" aria-label="Immanuel Gnanaseelan profiles">
          <a href="https://github.com/immanuelgn/TraceLattice" target="_blank" rel="noopener noreferrer" aria-label="TraceLattice source code on GitHub">
            <Code2 size={15} /> Source code
          </a>
          <a href="https://www.linkedin.com/in/immanuelgnanaseelan/" target="_blank" rel="noopener noreferrer" aria-label="Immanuel Gnanaseelan on LinkedIn">
            <BriefcaseBusiness size={15} /> LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { BriefcaseBusiness, Code2 } from "lucide-react";
import { BrandMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <BrandMark />
          <p>Defensive static intelligence for the public web.</p>
          <div className="footer-socials" aria-label="Immanuel Gnanaseelan profiles">
            <a href="https://github.com/immanuelgn" target="_blank" rel="noopener noreferrer" aria-label="Immanuel Gnanaseelan on GitHub">
              <Code2 size={16} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/immanuelgnanaseelan/" target="_blank" rel="noopener noreferrer" aria-label="Immanuel Gnanaseelan on LinkedIn">
              <BriefcaseBusiness size={16} /> LinkedIn
            </a>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/methodology">Methodology</Link>
          <Link href="/ethics">Security & ethics</Link>
          <Link href="/about">Portfolio notes</Link>
        </div>
        <p className="footer-note">No crawling. No JavaScript execution. No compliance guarantees.</p>
      </div>
    </footer>
  );
}

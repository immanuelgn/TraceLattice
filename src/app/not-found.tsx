import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="system-state container">
      <Radar size={30} />
      <span className="eyebrow">404 / route not found</span>
      <h1>This page is outside the observable map.</h1>
      <p>The requested TraceLattice route does not exist or has moved.</p>
      <Link className="button button-primary" href="/">
        <ArrowLeft size={17} />Return to scanner
      </Link>
    </div>
  );
}

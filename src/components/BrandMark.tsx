import { ScanSearch } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-icon"><ScanSearch size={18} /></span>
      {!compact && <span>Trace<span>Lattice</span></span>}
    </span>
  );
}

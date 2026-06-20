import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Image className="brand-icon" src="/tracelattice-icon.png" alt="" width={38} height={38} priority />
      {!compact && <span>Trace<span>Lattice</span></span>}
    </span>
  );
}

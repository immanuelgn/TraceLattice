export default function Loading() {
  return (
    <div className="route-loading container" role="status" aria-live="polite">
      <span />
      <div><strong>Loading TraceLattice</strong><small>Preparing the requested view</small></div>
    </div>
  );
}

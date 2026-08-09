/**
 * System brand mark: the LASU shield in a circular badge. Used consistently
 * across the landing page, global topbar, and staff console. The source PNG
 * is a shield on a solid black square canvas, so it is framed in a circle
 * (rounded-full + ring) rather than clipped, which would crop the shield and
 * leave black wedges at the corners.
 */
export default function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border shadow-sm ${className ?? ""}`}
    >
      <img
        src="/lasu.png"
        alt="Lagos State University"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

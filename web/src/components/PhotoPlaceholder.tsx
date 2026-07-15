/**
 * The prototype's hatched photo box. The schema carries no image columns and
 * the prototype ships no photos, so this is a faithful port of its placeholder
 * rather than simulated data.
 */
export function PhotoPlaceholder({
  label,
  height,
  radius = 10,
  tint = "sand",
  className = "",
}: {
  label?: string;
  height: number;
  radius?: number;
  /** "sand" for listings, "green" for the map locator box. */
  tint?: "sand" | "green";
  className?: string;
}) {
  const stripes =
    tint === "green"
      ? "repeating-linear-gradient(135deg,#eef2ee,#eef2ee 10px,#e2ebe4 10px,#e2ebe4 20px)"
      : "repeating-linear-gradient(135deg,#efece3,#efece3 10px,var(--border) 10px,var(--border) 20px)";

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ height, borderRadius: radius, background: stripes }}
    >
      {label && (
        <span
          className="font-mono text-[11px]"
          style={{ color: tint === "green" ? "#7a8a7d" : "#8a8577" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

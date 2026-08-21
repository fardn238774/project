/**
 * A living, drifting aurora backdrop rendered behind the whole app — like a
 * subtle animated wallpaper. Pure CSS (see globals.css `.live-bg`), so it needs
 * no client JS and stays smooth. Sits at z-index -1, above the flat page
 * background but behind all content.
 */
export function LiveBackground() {
  return (
    <>
      <div aria-hidden className="live-bg">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
        <div className="grid-move" />
      </div>
      {/* Spotlight that follows the cursor (position driven by Interactions). */}
      <div aria-hidden className="cursor-glow" />
    </>
  );
}

/** True when the player asked for less motion, in Settings or in the operating system. */
export function motionReduced(): boolean {
  return (
    document.documentElement.classList.contains("reduce-motion") ||
    (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
}

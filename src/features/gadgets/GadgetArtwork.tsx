import type { GadgetProductId } from "../../game/types";

const PRODUCT_ARTWORK_URLS: Record<GadgetProductId, string> = {
  wristband: "/gadget-assets/polsino.webp",
  mug: "/gadget-assets/tazza.webp",
  underwear: "/gadget-assets/mutande.webp",
  tshirt: "/gadget-assets/maglietta.webp",
  hoodie: "/gadget-assets/felpa.webp",
};

export function GadgetProductArtwork({
  productId,
  locked = false,
}: {
  productId: GadgetProductId;
  locked?: boolean;
}) {
  return (
    <div
      className={`gadget-product-artwork${locked ? " is-locked" : ""}`}
      aria-hidden="true"
    >
      <img
        src={PRODUCT_ARTWORK_URLS[productId]}
        alt=""
        width="126"
        height="126"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function GadgetWorkshopArtwork() {
  return (
    <svg
      className="gadget-workshop-artwork"
      viewBox="0 0 440 128"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M0 18h440M0 46h440M0 74h440M0 102h440" opacity=".16" />
        <path d="M28 0v128M84 0v128M140 0v128M196 0v128M252 0v128M308 0v128M364 0v128M420 0v128" opacity=".12" />
        <path d="m238 15 112 88" opacity=".28" />
        <path d="m254 7 112 88" opacity=".18" />
      </g>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="m310 95 75-76 11 11-75 76-22 10 11-21Z" strokeWidth="2.2" opacity=".42" />
        <path d="m310 95 11 11M385 19l11 11" strokeWidth="1.5" opacity=".3" />
        <path d="m191 91 24-68 86 30-24 68-86-30Z" strokeWidth="2" opacity=".32" />
        <path d="m209 86 4-12m8 15 4-12m8 15 4-12m8 15 4-12m8 15 4-12" strokeWidth="1.5" opacity=".3" />
      </g>
    </svg>
  );
}

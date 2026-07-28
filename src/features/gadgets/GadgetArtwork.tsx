import type { GadgetProductId } from "../../game/types";

function ProductSvg({ productId }: { productId: GadgetProductId }) {
  const commonProps = {
    viewBox: "0 0 120 100",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (productId) {
    case "wristband":
      return (
        <svg {...commonProps}>
          <ellipse cx="60" cy="38" rx="38" ry="17" />
          <path d="M22 38v18c0 9.4 17 17 38 17s38-7.6 38-17V38" />
          <path d="M29 46c7 6.2 18 9.8 31 9.8S84 52.2 91 46" />
          <path d="M45 24v29M75 24v29" />
          <path d="M51 33c6-3 12-3 18 0" opacity=".45" />
        </svg>
      );
    case "mug":
      return (
        <svg {...commonProps}>
          <path d="M27 24h53v45c0 9-10.6 16-26.5 16S27 78 27 69V24Z" />
          <ellipse cx="53.5" cy="24" rx="26.5" ry="7" />
          <path d="M80 35h7c11 0 14 8 14 17s-4 17-16 17h-5" />
          <path d="M80 43h6c5 0 7 3.7 7 9s-2.5 9-8 9h-5" />
          <path d="M42 48h23M46 56h15" opacity=".45" />
        </svg>
      );
    case "underwear":
      return (
        <svg {...commonProps}>
          <path d="M20 24c25 5 55 5 80 0l-4 16c-3 21-14 36-31 45H55C38 76 27 61 24 40l-4-16Z" />
          <path d="M23 33c24 5 50 5 74 0" />
          <path d="M43 39c2 18 7 31 17 44M77 39c-2 18-7 31-17 44" />
          <path d="M31 28v9M89 28v9" opacity=".45" />
        </svg>
      );
    case "tshirt":
      return (
        <svg {...commonProps}>
          <path d="m43 20-8 4-19 17 12 17 12-9v36h40V49l12 9 12-17-19-17-8-4" />
          <path d="M43 20c2 10 8 15 17 15s15-5 17-15" />
          <path d="M50 68h20M50 75h20" opacity=".45" />
        </svg>
      );
    case "hoodie":
      return (
        <svg {...commonProps}>
          <path d="M42 27 30 31 17 51l13 10 10-12v37h40V49l10 12 13-10-13-20-12-4" />
          <path d="M42 27C43 13 50 6 60 6s17 7 18 21c-5-5-11-7-18-7s-13 2-18 7Z" />
          <path d="M51 25v23M69 25v23" />
          <path d="M45 67c10-7 20-7 30 0v11H45V67Z" />
        </svg>
      );
  }
}

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
      <ProductSvg productId={productId} />
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

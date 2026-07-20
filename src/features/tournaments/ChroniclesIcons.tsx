import type { SVGProps } from "react";
import type { RockPaperScissorsChoice } from "../../game/types";

export function ChroniclesKeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 9 9m-3-3 2-2m-5-1 2-2" />
    </svg>
  );
}

export function ChroniclesChoiceIcon({
  choice,
  ...props
}: { choice: RockPaperScissorsChoice } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {choice === "paper" ? (
        <>
          <path d="M13 6h16l7 7v29H13z" />
          <path d="M29 6v8h7M19 23h11M19 29h11M19 35h8" />
        </>
      ) : choice === "scissors" ? (
        <>
          <circle cx="13" cy="34" r="6" /><circle cx="29" cy="34" r="6" />
          <path d="m17 30 20-21M25 30 11 12m19 2 7-5" />
        </>
      ) : (
        <>
          <path d="M12 38c-4-8-1-20 7-27l5-4 6 3 6 8 2 12-6 10-13 2z" />
          <path d="m17 14 7 5 7-4m-18 8 9 4 12-5m-22 9 11 3 14-5" />
        </>
      )}
    </svg>
  );
}

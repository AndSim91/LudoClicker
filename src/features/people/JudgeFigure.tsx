import type { ReactNode } from "react";
import type { JudgeShape } from "./judgeShape";

/**
 * The judge's figure from a judgeShape, for every scene with judges (the gym,
 * the Arena final). `prefix` names the scene's classes: «gym-judge» draws with
 * .gym-judge-ink/-limb/-phone/-tap, «fd-judge» with .fd-judge-*.
 * While reading, three «+» flash next to Servizio, like its buttons.
 */
export function JudgeFigure({
  shape,
  prefix,
  f,
  reading = false,
  cardArm = true,
  wear,
}: {
  shape: JudgeShape;
  prefix: string;
  f: 1 | -1;
  reading?: boolean;
  /** False while the card is up: the scene draws the raised arm itself. */
  cardArm?: boolean;
  /** Clothes over the torso, under the arms (the referee's T-shirt). */
  wear?: ReactNode;
}) {
  const phone = shape.phone;
  const tapX = phone ? phone[0] + (f > 0 ? 9 : -3) : 0;
  return (
    <>
      <circle className={`${prefix}-ink`} cx={shape.head[0]} cy={shape.head[1]} r={6.5} />
      <path className={`${prefix}-limb`} d={shape.body} />
      {wear}
      {shape.arms ? <path className={`${prefix}-limb`} d={shape.arms} /> : null}
      {cardArm && shape.cardArm ? <path className={`${prefix}-limb`} d={shape.cardArm} /> : null}
      {phone ? <rect className={reading ? `${prefix}-phone is-lit` : `${prefix}-phone`} x={phone[0]} y={phone[1]} width={6} height={9} rx={1} /> : null}
      {reading && phone
        ? [0, 1, 2].map((i) => (
            <text key={i} className={`${prefix}-tap`} x={tapX + (i % 2) * 3 * f} y={phone[1] + 1 + i * 4}>+</text>
          ))
        : null}
    </>
  );
}

import type { ReactNode } from "react";
import type { JudgeShape } from "./judgeShape";

/**
 * The judge's figure from a judgeShape, for every scene with judges (the gym,
 * the Arena final). `prefix` names the scene's classes: «gym-judge» draws with
 * .gym-judge-ink/-limb/-phone, «fd-judge» with .fd-judge-*.
 * While reading (concept S2), the bowed head and the raised one cross-fade and
 * the tapping finger presses Servizio, whose screen lights at each press: all
 * on the figure, nothing in the air. The animations (skin-onde.css) last as long
 * as JUDGE_READ_MS and start when reading starts, since these elements mount then.
 */
export function JudgeFigure({
  shape,
  prefix,
  reading = false,
  cardArm = true,
  wear,
}: {
  shape: JudgeShape;
  prefix: string;
  reading?: boolean;
  /** False while the card is up: the scene draws the raised arm itself. */
  cardArm?: boolean;
  /** Clothes over the torso, under the arms (the referee's T-shirt). */
  wear?: ReactNode;
}) {
  const phone = shape.phone;
  const writing = reading && shape.tapArm !== undefined;
  return (
    <>
      <circle className={writing ? `${prefix}-ink judge-head-down` : `${prefix}-ink`} cx={shape.head[0]} cy={shape.head[1]} r={6.5} />
      {writing && shape.headUp ? (
        <circle className={`${prefix}-ink judge-head-up`} cx={shape.headUp[0]} cy={shape.headUp[1]} r={6.5} />
      ) : null}
      <path className={`${prefix}-limb`} d={shape.body} />
      {wear}
      {shape.arms ? <path className={`${prefix}-limb`} d={shape.arms} /> : null}
      {cardArm && shape.cardArm ? <path className={`${prefix}-limb`} d={shape.cardArm} /> : null}
      {phone ? <rect className={writing ? `${prefix}-phone judge-screen` : `${prefix}-phone`} x={phone[0]} y={phone[1]} width={6} height={9} rx={1} /> : null}
      {writing ? <path className={`${prefix}-limb judge-finger`} d={shape.tapArm} /> : null}
    </>
  );
}

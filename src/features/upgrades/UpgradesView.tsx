import { getFlowCap, getPerfectPhraseChance } from "../../game/writingRhythm";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useUpgradeSpark } from "./useUpgradeSpark";
import { Icon, type IconName } from "../../components/common/Icon";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  areAllFormBranchesUnlocked,
  getCreativityProgress,
  getEquipmentPreparedWorkMaximum,
  getAgonistCourseMaximumStatGain,
  getAnnualFormTrainingLimit,
  getNetworkEventContactMultiplier,
  getNetworkSponsorIncome,
  getPagoSportAllCourseSpeedBonus,
  getPagoSportTechnicianSpeedBonus,
  getUpgradeCategoryPoints,
  getUpgradeCost,
  getUpgradeEffectTotal,
  getUpgradeRequirements,
  isAgonistCourseUnlocked,
  isCourseXUnlocked,
  type UpgradeCategory,
  type UpgradeDefinition,
} from "../../content/upgrades";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  getSocialContentCharacters,
  getSocialDoubleFollowerChance,
  getSocialEventPromotionBonus,
  getSocialFollowerChance,
  getSocialFollowerValue,
} from "../../game/social";
import type { GameState, SecretUpgradeId, UpgradeId } from "../../game/types";
import { formatCurrency, formatPercent, formatShortCurrency, formatStat } from "../../shared/formatters";
import { getEmailBookingChance } from "../../game/formulas";
import { buyAllAffordableUpgrades } from "../../game/upgradeFlow";
import { GADGET_DEFINITIONS } from "../../content/gadgets";
import {
  getGadgetFollowerReach,
  getGadgetMemberReach,
} from "../../game/gadgetEconomy";

const categoryIcons: Record<UpgradeCategory, IconName> = {
  speed: "spark",
  charisma: "people",
  writing: "mail",
  welcome: "contact",
  social: "people",
  equipment: "settings",
  organization: "tasks",
  instructors: "people",
  gadget: "gift",
  secrets: "lock",
  network: "network",
};

const numberFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

/** Node and quick-buy prices stay exact up to 99.999 €, then shorten («12,8M €») to fit the node. */
function formatNodePrice(cost: number): string {
  return cost < 100_000 ? `${formatStat(cost)} €` : formatShortCurrency(cost);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatUpgradePercentage(value: number) {
  return `${(value * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function getUpgradeBenefitsSummary(state: GameState) {
  const benefits = [
    { label: "Caratteri per input", value: formatNumber(state.player.writingPower) },
  ];
  const perfectPhraseChance = getPerfectPhraseChance(state);
  if (perfectPhraseChance > 0) {
    benefits.push({ label: "Frase perfetta", value: `${(perfectPhraseChance * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%` });
  }
  const flowCap = getFlowCap(state.upgrades);
  if (flowCap > 1) benefits.push({ label: "Flusso massimo", value: `×${flowCap}` });
  const addPercentage = (label: string, effect: Parameters<typeof getUpgradeEffectTotal>[1], sign = "+") => {
    const total = getUpgradeEffectTotal(state.upgrades, effect);
    if (total > 0) benefits.push({ label, value: `${sign}${formatUpgradePercentage(total)}` });
  };
  const addAmount = (label: string, effect: Parameters<typeof getUpgradeEffectTotal>[1]) => {
    const total = getUpgradeEffectTotal(state.upgrades, effect);
    if (total > 0) benefits.push({ label, value: `+${formatNumber(total)}` });
  };

  addPercentage("Contatti", "eventContactsMultiplier");
  addPercentage("Pubblico eventi", "eventAttendanceMultiplier");
  addPercentage("Velocità Redazione/Social", "editorialAutomationMultiplier");
  addPercentage("Possibilità Iscrizioni", "enrollmentProgress");
  addPercentage("Automazione", "automationMultiplier");
  addPercentage("Entrate", "incomeMultiplier");
  addPercentage("Quote mensili", "membershipIncomeMultiplier");
  addPercentage("Costi corsi Istruttori/Tecnici", "courseCostReduction", "−");
  addPercentage("Usura", "equipmentWearReduction", "−");
  addPercentage("Attesa tra gli eventi", "eventCooldownReduction", "−");
  addPercentage("Rischio di non rinnovare", "departureRiskReduction", "−");
  addPercentage("Iscritti che portano un amico", "referralChance", "");
  addPercentage("Interessi mensili sui Fondi", "depositInterestRate", "");
  addPercentage("Velocità dei corsi (Rete)", "courseSpeedBonus");
  const networkEventBonus = getNetworkEventContactMultiplier(state.upgrades, state.network.schoolCount) - 1;
  if (networkEventBonus > 0) {
    benefits.push({ label: "Contatti eventi (Rete)", value: `+${formatUpgradePercentage(networkEventBonus)}` });
  }
  const networkSponsor = getNetworkSponsorIncome(state.upgrades, state.network.schoolCount);
  if (networkSponsor > 0) benefits.push({ label: "Sponsor nazionale", value: `${formatCurrency(networkSponsor)} al mese` });
  addPercentage("Nuovi iscritti con la Forma 1", "enrollmentFormOneChance", "");
  addPercentage("Arena e Stile di partenza", "athleteBaseStatsBonus");
  addPercentage("Leggendari tra i contatti", "legendaryAppearanceBonus");
  addPercentage("Manutenzione automatica", "equipmentAutomationMultiplier");
  const preparedWorkMaximum = getEquipmentPreparedWorkMaximum(state);
  if (preparedWorkMaximum > 0) {
    benefits.push({
      label: "Riserva manutenzione",
      value: `${formatNumber(preparedWorkMaximum)} punti`,
    });
  }
  const annualFormLimit = getAnnualFormTrainingLimit(state.upgrades);
  if (annualFormLimit > 1) {
    benefits.push({ label: "Forme annue", value: formatNumber(annualFormLimit) });
  }
  addAmount("Rami per Istruttore", "instructorBranchCapacity");
  addPercentage("Superamento corsi", "trainingExamSuccessChance");
  if (areAllFormBranchesUnlocked(state.upgrades)) {
    benefits.push({ label: "Rami dopo Corso Y", value: "tutti" });
  }
  addAmount("Allievi per Istruttore", "instructorStudentCapacity");
  addPercentage("Velocità insegnamento", "instructorTeachingSpeed");
  addPercentage("Efficacia Preparazione agonistica", "athleticPreparationPower");
  if (getPagoSportTechnicianSpeedBonus(state.upgrades) > 0) {
    benefits.push({ label: "Velocità Corsi Tecnici", value: "+50%" });
  }
  if (getPagoSportAllCourseSpeedBonus(state.upgrades) > 0) {
    benefits.push({ label: "Velocità di tutti i corsi", value: "+50%" });
  }
  if (isCourseXUnlocked(state.upgrades)) {
    benefits.push({ label: "Corso X", value: "attivo" });
  }
  const agonistCourseMaximum = getAgonistCourseMaximumStatGain(state.upgrades);
  if (agonistCourseMaximum > 1) {
    benefits.push({
      label: "Bonus Corso Agonisti",
      value: `da +1 a +${agonistCourseMaximum} per caratteristica`,
    });
  }

  const agonistCourseTier = getUpgradeEffectTotal(state.upgrades, "agonistCourseTier");
  if (agonistCourseTier > 0) {
    const agonistCourseUnlocked = isAgonistCourseUnlocked(state.upgrades);
    benefits.push({
      label: agonistCourseUnlocked ? "Corso Agonisti" : "Arena Tecnica",
      value: agonistCourseUnlocked ? "attivo" : `livello ${agonistCourseTier}`,
    });
  }
  if (state.unlocks.social) {
    benefits.push(
      {
        label: "Contenuti Social",
        value: `${formatNumber(getSocialContentCharacters(state.upgrades))} caratteri`,
      },
      {
        label: "Follower per contenuto",
        value: [
          getUpgradeEffectTotal(state.upgrades, "socialExtraFollowers") > 0
            ? `+${getUpgradeEffectTotal(state.upgrades, "socialExtraFollowers")} sicuri`
            : "",
          formatUpgradePercentage(getSocialFollowerChance(state.upgrades)),
          getSocialDoubleFollowerChance(state.upgrades) > 0
            ? `${formatUpgradePercentage(getSocialDoubleFollowerChance(state.upgrades))} doppio`
            : "",
        ].filter(Boolean).join(" · "),
      },
      {
        label: "Promozione eventi",
        value: `+${formatUpgradePercentage(getSocialEventPromotionBonus(
          state.school.followers,
        ))} · 5% ogni 1.000 follower`,
      },
      {
        label: "Valore follower",
        value: `${getSocialFollowerValue(state.upgrades).toLocaleString("it-IT", {
          maximumFractionDigits: 3,
        })} €`,
      },
    );
  }
  if (state.unlocks.gadget) {
    benefits.push(
      {
        label: "Copertura iscritti Gadget",
        value: formatUpgradePercentage(getGadgetMemberReach(state.upgrades)),
      },
      {
        label: "Copertura follower Gadget",
        value: formatUpgradePercentage(getGadgetFollowerReach(state.upgrades)),
      },
    );
  }

  return benefits;
}

function getCategorySummary(state: GameState, category: UpgradeCategory) {
  switch (category) {
    case "speed":
      return `${formatNumber(state.player.writingPower)} caratteri per input · +${Math.round(getUpgradeEffectTotal(state.upgrades, "editorialAutomationMultiplier") * 100)}% Redazione`;
    case "charisma":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier") * 100)}% contatti`;
    case "writing":
      return `${Math.round(getCreativityProgress(state.upgrades) * 35)}/35 punti Creatività · prova dopo l'email ${formatPercent(getEmailBookingChance(state))}`;
    case "welcome":
      return `${Math.round(getUpgradeEffectTotal(state.upgrades, "enrollmentProgress") * 100)}% della possibilità di Iscrizione`;
    case "equipment":
      return `−${Math.round(getUpgradeEffectTotal(state.upgrades, "equipmentWearReduction") * 100)}% usura · riserva ${formatNumber(getEquipmentPreparedWorkMaximum(state))}`;
    case "organization":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "automationMultiplier") * 100)}% automazione`;
    case "instructors":
      return `Forme annue ${getAnnualFormTrainingLimit(state.upgrades)}/3 · ${
        isAgonistCourseUnlocked(state.upgrades)
          ? `Corso Agonisti fino a +${getAgonistCourseMaximumStatGain(state.upgrades)}`
          : (state.upgrades["technical-arena"] ?? 0) >= 1
            ? "Arena Tecnica attiva"
            : "Corsi agonistici da sbloccare"
      }`;
    case "gadget":
      return `${formatUpgradePercentage(getGadgetMemberReach(state.upgrades))} iscritti · ${formatUpgradePercentage(getGadgetFollowerReach(state.upgrades))} follower`;
    case "secrets":
      return "Segui gli indizi per rivelare i percorsi";
    case "network":
      return `${formatNumber(state.network.schoolCount)} ${state.network.schoolCount === 1 ? "scuola fondata" : "scuole fondate"}`;
    case "social":
      return "";
  }
}

type UpgradeStatus = "locked" | "available" | "completed";

/** The node line is a soft wave: odd nodes sit lower by this much (px). */
const WAVE_AMPLITUDE = 24;
/** Every lane uses the same nine columns, so nodes line up across branches. */
const LANE_COLUMNS = 9;

function getCategoryTitle(category: UpgradeCategory): string {
  return UPGRADE_CATEGORIES.find((entry) => entry.id === category)?.title ?? "";
}

interface UpgradeRequirementRow {
  /** Short line under a locked node («🔒 9 punti in Scrittura»). */
  short: string;
  /** Line in the details window («Si apre con»). */
  full: string;
  met: boolean;
}

/**
 * Everything that opens a node, in display order: points of its branch, then
 * the narrative links (another branch, a node at a given level, a game feature).
 */
function getUpgradeRequirementRows(state: GameState, definition: UpgradeDefinition): UpgradeRequirementRow[] {
  const rows: UpgradeRequirementRow[] = [];
  for (const requirement of getUpgradeRequirements(state.upgrades, definition)) {
    if (requirement.kind === "points") {
      const branch = getCategoryTitle(requirement.category);
      rows.push({
        short: `${requirement.required} ${requirement.required === 1 ? "punto" : "punti"} in ${branch}`,
        full: `${requirement.required} ${requirement.required === 1 ? "punto" : "punti"} in ${branch} (ne hai ${requirement.current})`,
        met: requirement.met,
      });
    } else {
      const { definition: required, level } = requirement;
      const label = level >= required.maxLevel && required.maxLevel > 1
        ? `${required.title} completo`
        : required.maxLevel === 1
          ? required.title
          : `${required.title} liv. ${level}`;
      rows.push({ short: label, full: label, met: requirement.met });
    }
  }
  for (const unlock of definition.requiredUnlocks ?? []) {
    const met = Boolean(state.unlocks[unlock]);
    if (unlock === "social") rows.push({ short: "Serve il Social", full: "Social sbloccato", met });
    else if (unlock === "gadget") rows.push({ short: "Serve il settore Gadget", full: "Settore Gadget sbloccato", met });
    else if (unlock === "forms") rows.push({ short: "Servono le Forme", full: "Centro didattico aperto (Forme)", met });
    else rows.push({ short: "Funzione da sbloccare", full: "Funzione del gioco sbloccata", met });
  }
  if (definition.requiredNetworkSchools !== undefined) {
    const one = definition.requiredNetworkSchools === 1;
    rows.push({
      short: one ? "Fonda un'altra scuola" : `${definition.requiredNetworkSchools} scuole fondate`,
      full: one ? "Un'altra scuola fondata" : `${definition.requiredNetworkSchools} scuole fondate`,
      met: state.network.schoolCount >= definition.requiredNetworkSchools,
    });
  }
  if (definition.requiredGadgetProduct !== undefined) {
    const name = GADGET_DEFINITIONS[definition.requiredGadgetProduct].name;
    rows.push({
      short: `Serve il progetto ${name}`,
      full: `Progetto ${name} sbloccato`,
      met: state.gadgets.products[definition.requiredGadgetProduct].unlocked,
    });
  }
  if (definition.requiredFame > 0) {
    rows.push({
      short: `Fama ${definition.requiredFame}`,
      full: `Fama della scuola ${definition.requiredFame}`,
      met: state.school.fame >= definition.requiredFame,
    });
  }
  return rows;
}

function getUpgradeLockReason(state: GameState, definition: UpgradeDefinition): string | null {
  if (
    definition.secretHint !== undefined &&
    !state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId)
  ) return "Percorso segreto non ancora scoperto";
  return getUpgradeRequirementRows(state, definition).find((row) => !row.met)?.short ?? null;
}

function UpgradeTitle({ definition }: { definition: UpgradeDefinition }) {
  const emphasizedPart = definition.emphasizedTitlePart;
  if (!emphasizedPart) return definition.title;

  const emphasizedPartIndex = definition.title.indexOf(emphasizedPart);
  if (emphasizedPartIndex < 0) return definition.title;

  return (
    <>
      {definition.title.slice(0, emphasizedPartIndex)}
      <em>{emphasizedPart}</em>
      {definition.title.slice(emphasizedPartIndex + emphasizedPart.length)}
    </>
  );
}

function isUpgradeVisible(state: GameState, definition: UpgradeDefinition): boolean {
  return !definition.hidden &&
    (definition.category !== "secrets" ||
      state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId)) &&
    (definition.category !== "social" || state.unlocks.social) &&
    (definition.category !== "gadget" || state.unlocks.gadget) &&
    (definition.category !== "network" || state.network.schoolCount > 0);
}

function isUpgradeCategoryVisible(state: GameState, category: UpgradeCategory): boolean {
  if (category === "social") return state.unlocks.social;
  if (category === "gadget") return state.unlocks.gadget;
  // Rete dell'Ordine: from the first foundation on.
  if (category === "network") return state.network.schoolCount > 0;
  return true;
}

/** What «Compra tutto» would buy right now: same rule as the engine, run on a copy. */
function getBuyAllPlan(state: GameState) {
  const after = buyAllAffordableUpgrades(state);
  let count = 0;
  for (const definition of UPGRADE_DEFINITIONS) {
    count += after.upgrades[definition.id] - state.upgrades[definition.id];
  }
  const total = state.school.euros - after.school.euros;
  return { count, total };
}

function getUpgradeStatus(state: GameState, definition: UpgradeDefinition): UpgradeStatus {
  const level = state.upgrades[definition.id];
  if (level >= definition.maxLevel) return "completed";
  return getUpgradeLockReason(state, definition) ? "locked" : "available";
}

/** The wave through the node centres (x = 100 per node, y = 15 or 15 + amplitude). */
function getWavePath(lastIndex: number): string {
  if (lastIndex <= 0) return "";
  const y = (index: number) => (index % 2 === 0 ? 15 : 15 + WAVE_AMPLITUDE);
  let path = `M0,${y(0)}`;
  for (let index = 1; index <= lastIndex; index += 1) {
    const from = (index - 1) * 100;
    const to = index * 100;
    path += ` C${from + 50},${y(index - 1)} ${to - 50},${y(index)} ${to},${y(index)}`;
  }
  return path;
}

function UpgradeLaneWave({ count, litTo }: { count: number; litTo: number }) {
  if (count < 2) return null;
  const width = (count - 1) * 100;
  return (
    <svg
      className="upgrade-lane-wave"
      aria-hidden="true"
      viewBox={`0 0 ${width} 54`}
      preserveAspectRatio="none"
      style={{ width: `calc(${count - 1} * 100% / ${LANE_COLUMNS})` }}
    >
      <path className="upgrade-lane-wave-base" d={getWavePath(count - 1)} />
      {litTo > 0 ? <path className="upgrade-lane-wave-lit" d={getWavePath(litTo)} /> : null}
    </svg>
  );
}

function UpgradeNode({
  definition,
  index,
  state: stateOverride,
  selected,
  onSelect,
  onQuickBuy,
}: {
  definition: UpgradeDefinition;
  index: number;
  state?: GameState;
  selected: boolean;
  onSelect: (anchor: HTMLButtonElement) => void;
  /** Only the cheapest node on the page gets a buy button of its own. */
  onQuickBuy?: () => void;
}) {
  const state = useGameStateSlices(
    ["equipment", "gadgets", "network", "player", "school", "secretUpgradeDiscoveries", "unlocks", "upgrades"],
    stateOverride,
  );
  const level = state.upgrades[definition.id];
  const status = getUpgradeStatus(state, definition);
  const lockReason = getUpgradeLockReason(state, definition);
  const cost = getUpgradeCost(definition, level, state.network.schoolCount);
  const unaffordable = status === "available" && state.school.euros < cost;
  const spark = useUpgradeSpark(level, status);
  const stateLabel = status === "locked"
    ? `bloccato, ${lockReason?.toLocaleLowerCase("it")}`
    : status === "completed"
      ? "completato"
      : unaffordable
        ? "disponibile, saldo insufficiente"
        : "disponibile";
  const low = index % 2 === 1;

  return (
    <li
      className={`upgrade-node-item${onQuickBuy ? " cheapest" : ""}${spark.className}`}
      style={{
        ...spark.style,
        paddingTop: low ? WAVE_AMPLITUDE : 0,
        "--node-drop": `${low ? WAVE_AMPLITUDE : 0}px`,
        "--comet-rise": `${low ? -WAVE_AMPLITUDE : WAVE_AMPLITUDE}px`,
      } as CSSProperties}
    >
      <button
        type="button"
        className={`upgrade-node ${status}${unaffordable ? " unaffordable" : ""}${selected ? " selected" : ""}`}
        onClick={(event) => onSelect(event.currentTarget)}
        aria-label={`Apri dettagli ${definition.title}: livello ${level} di ${definition.maxLevel}, ${stateLabel}`}
        aria-pressed={selected}
      >
        {/* Keyed on the spark, so a second quick purchase replays the pop and the ring. */}
        <span key={spark.id} className="upgrade-node-icon" aria-hidden="true">
          {status === "completed" ? <span className="upgrade-node-check">✓</span> : <Icon name={categoryIcons[definition.category]} />}
        </span>
        <strong><UpgradeTitle definition={definition} /></strong>
        {status === "completed" ? null : status === "locked" ? (
          <span className="upgrade-node-lock">
            <Icon name="lock" />
            {lockReason}
          </span>
        ) : (
          <span className="upgrade-node-level">
            {onQuickBuy
              ? `${level}/${definition.maxLevel}`
              : <>{definition.maxLevel > 1 ? `${level}/${definition.maxLevel} · ` : ""}{formatNodePrice(cost)}</>}
          </span>
        )}
      </button>
      {spark.className.includes("just-completed") ? <span key={spark.id} className="branch-comet" aria-hidden="true" /> : null}
      {onQuickBuy ? (
        <button
          type="button"
          className="upgrade-quick-buy"
          onClick={onQuickBuy}
          disabled={unaffordable}
          aria-label={`Compra ${definition.title}`}
          title={unaffordable ? `Mancano ${formatCurrency(cost - state.school.euros)}` : "Il più economico"}
        >
          <span>Compra</span>
          <span className="upgrade-quick-buy-price">{formatNodePrice(cost)}</span>
        </button>
      ) : null}
    </li>
  );
}

function MysteryUpgradeNode({
  index,
  selected,
  onSelect,
}: {
  index: number;
  selected: boolean;
  onSelect: (anchor: HTMLButtonElement) => void;
}) {
  return (
    <li className="upgrade-node-item" style={{ paddingTop: index % 2 === 1 ? WAVE_AMPLITUDE : 0 }}>
      <button
        type="button"
        className={`upgrade-node locked mystery${selected ? " selected" : ""}`}
        onClick={(event) => onSelect(event.currentTarget)}
        aria-label="Percorso segreto: leggi l'indizio"
        aria-pressed={selected}
      >
        <span className="upgrade-node-icon" aria-hidden="true"><Icon name="lock" /></span>
        <strong>???</strong>
        <span className="upgrade-node-level">Leggi l'indizio</span>
      </button>
    </li>
  );
}

function UpgradeDetailsDialog({
  definition,
  state: stateOverride,
  anchor,
  onClose,
  onBuy,
}: {
  definition: UpgradeDefinition;
  state?: GameState;
  anchor: HTMLButtonElement;
  onClose: () => void;
  onBuy: () => void;
}) {
  const state = useGameStateSlices(
    ["equipment", "gadgets", "network", "player", "school", "secretUpgradeDiscoveries", "unlocks", "upgrades"],
    stateOverride,
  );
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    anchorX: number;
    maxHeight: number;
    placement: "top" | "bottom";
  } | null>(null);
  const level = state.upgrades[definition.id];
  const cost = getUpgradeCost(definition, level, state.network.schoolCount);
  const lockReason = getUpgradeLockReason(state, definition);
  const requirements = getUpgradeRequirementRows(state, definition);
  const completed = level >= definition.maxLevel;
  const affordable = state.school.euros >= cost;
  const canBuy = !lockReason && affordable && !completed;
  const undiscovered = definition.secretHint !== undefined &&
    !state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId);
  const branchIndex = UPGRADE_DEFINITIONS
    .filter((entry) => entry.category === definition.category && !entry.hidden)
    .findIndex((entry) => entry.id === definition.id);

  // Next to the clicked node: below it, or above when the screen has more room there.
  useLayoutEffect(() => {
    const updatePosition = () => {
      const panel = dialogRef.current;
      if (!panel) return;
      const anchorRect = anchor.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const viewportPadding = 12;
      const gap = 10;
      const anchorCenter = anchorRect.left + anchorRect.width / 2;
      const left = Math.min(
        Math.max(viewportPadding, anchorCenter - panelWidth / 2),
        window.innerWidth - panelWidth - viewportPadding,
      );
      const availableBelow = window.innerHeight - viewportPadding - anchorRect.bottom - gap;
      const availableAbove = anchorRect.top - viewportPadding - gap;
      const fitsBelow = panelHeight <= availableBelow;
      const fitsAbove = panelHeight <= availableAbove;
      const placement = fitsBelow || (!fitsAbove && availableBelow >= availableAbove)
        ? "bottom"
        : "top";
      const maxHeight = Math.max(
        180,
        placement === "bottom" ? availableBelow : availableAbove,
      );
      const top = placement === "bottom"
        ? anchorRect.bottom + gap
        : anchorRect.top - Math.min(panelHeight, maxHeight) - gap;
      setPosition({
        left,
        top,
        anchorX: Math.min(panelWidth - 22, Math.max(22, anchorCenter - left)),
        maxHeight,
        placement,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchor, definition.id]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !dialogRef.current?.contains(target) &&
        !anchor.contains(target)
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [anchor, onClose]);

  return (
    <section
      ref={dialogRef}
      className="upgrade-dialog"
      role="dialog"
      aria-labelledby="upgrade-dialog-title"
      aria-describedby="upgrade-dialog-description"
      data-placement={position?.placement ?? "bottom"}
      data-state={completed ? "completed" : lockReason ? "locked" : canBuy ? "buy" : "unaffordable"}
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        maxHeight: position?.maxHeight,
        visibility: position ? "visible" : "hidden",
        "--upgrade-anchor-x": `${position?.anchorX ?? 22}px`,
      } as CSSProperties}
    >
      <span className="upgrade-dialog-arrow" aria-hidden="true" />
      <div className="upgrade-dialog-content">
        <header>
          <div className="upgrade-dialog-icon"><Icon name={categoryIcons[definition.category]} /></div>
          <div>
            <span>
              {getCategoryTitle(definition.category)}
              {branchIndex >= 0 && definition.category !== "secrets" ? ` · nodo ${branchIndex + 1}` : ""}
            </span>
            <h2 id="upgrade-dialog-title">
              {undiscovered ? "???" : <UpgradeTitle definition={definition} />}
            </h2>
          </div>
          <button ref={closeButtonRef} type="button" className="upgrade-dialog-close" onClick={onClose} aria-label="Chiudi dettagli">×</button>
        </header>

        {undiscovered ? (
          <p id="upgrade-dialog-description">
            <strong>Indizio:</strong> {definition.secretHint}
          </p>
        ) : (
          <>
            <p id="upgrade-dialog-description">{definition.description}</p>

            <dl className="upgrade-dialog-stats">
              <div>
                <dt>Livello</dt>
                <dd className="upgrade-dialog-level">
                  {definition.maxLevel > 1 ? (
                    <span className="upgrade-dialog-pips" aria-hidden="true">
                      {Array.from({ length: definition.maxLevel }, (_, pip) => (
                        <i key={pip} className={pip < level ? "is-on" : undefined} />
                      ))}
                    </span>
                  ) : null}
                  {level} di {definition.maxLevel}
                </dd>
              </div>
              <div><dt>Effetto</dt><dd>{definition.effectLabel}</dd></div>
              <div>
                <dt>Si apre con</dt>
                <dd>
                  {requirements.length === 0 ? "Aperto da subito" : (
                    <ul className="upgrade-dialog-requirements">
                      {requirements.map((requirement) => (
                        <li key={requirement.full} className={requirement.met ? "is-met" : undefined}>
                          <Icon name={requirement.met ? "check" : "lock"} />
                          {requirement.full}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>

            {completed ? (
              <p className="upgrade-dialog-status positive"><span aria-hidden="true">✓</span> Completato.</p>
            ) : (
              <button type="button" className="upgrade-dialog-buy" onClick={onBuy} disabled={!canBuy}>
                {lockReason
                  ? `Bloccato · ${formatStat(cost)} €`
                  : affordable
                    ? `Compra · ${formatStat(cost)} €`
                    : `${formatStat(cost)} € · mancano ${formatCurrency(cost - state.school.euros)}`}
              </button>
            )}
            {!completed && branchIndex >= 0 ? (
              <p className="upgrade-dialog-next">{getNextNodeText(definition)}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function getNextNodeText(definition: UpgradeDefinition): string {
  if (definition.category === "secrets") return "";
  const branch = UPGRADE_DEFINITIONS.filter(
    (entry) => entry.category === definition.category && !entry.hidden,
  );
  const next = branch[branch.findIndex((entry) => entry.id === definition.id) + 1];
  return next ? `Poi nel ramo: ${next.title}` : "Ultimo nodo del ramo";
}

export function UpgradesView({
  state: stateOverride,
  onBuyUpgrade,
  onBuyAllUpgrades,
}: {
  state?: GameState;
  onBuyUpgrade: (upgradeId: UpgradeId) => void;
  /** Spends the funds on the cheapest upgrades, one after another, until nothing fits. */
  onBuyAllUpgrades?: () => void;
}) {
  const state = useGameStateSlices(
    ["equipment", "gadgets", "network", "player", "school", "secretUpgradeDiscoveries", "unlocks", "upgrades"],
    stateOverride,
  );
  const [selection, setSelection] = useState<{
    upgradeId: UpgradeId;
    anchor: HTMLButtonElement;
  } | null>(null);
  const selectedDefinition = selection
    ? UPGRADE_DEFINITIONS.find((definition) => definition.id === selection.upgradeId) ?? null
    : null;
  const closeDetails = useCallback(() => {
    const anchor = selection?.anchor;
    setSelection(null);
    window.requestAnimationFrame(() => anchor?.focus());
  }, [selection]);
  const toggleDetails = (upgradeId: UpgradeId, anchor: HTMLButtonElement) =>
    setSelection((current) => current?.upgradeId === upgradeId ? null : { upgradeId, anchor });
  let availableCount = 0;
  let completedCount = 0;
  let visibleCount = 0;
  let recommendedUpgrade: { definition: UpgradeDefinition; cost: number } | undefined;
  for (const definition of UPGRADE_DEFINITIONS) {
    if (definition.category === "secrets") continue;
    if (!isUpgradeVisible(state, definition)) continue;
    visibleCount += 1;
    const status = getUpgradeStatus(state, definition);
    if (status === "completed") {
      completedCount += 1;
      continue;
    }
    if (status !== "available") continue;
    availableCount += 1;
    const cost = getUpgradeCost(
      definition,
      state.upgrades[definition.id],
      state.network.schoolCount,
    );
    if (!recommendedUpgrade || cost < recommendedUpgrade.cost) {
      recommendedUpgrade = { definition, cost };
    }
  }
  const upgradeBenefits = getUpgradeBenefitsSummary(state);
  const buyAllPlan = onBuyAllUpgrades ? getBuyAllPlan(state) : { count: 0, total: 0 };
  const buyCheapest = recommendedUpgrade
    ? () => onBuyUpgrade(recommendedUpgrade.definition.id)
    : undefined;

  return (
    <main className="overview-view shop-view">
      <header className="upgrade-page-header">
        <Icon name="spark" />
        <div><h1>Upgrade</h1><p>Spendere oggi per lavorare meno domani.</p></div>
        <div className="upgrade-header-actions">
          {onBuyAllUpgrades ? (
            <button
              type="button"
              className="upgrade-buy-all"
              onClick={onBuyAllUpgrades}
              disabled={buyAllPlan.count === 0}
              aria-label={`Compra tutto: ${buyAllPlan.count} upgrade per ${formatStat(buyAllPlan.total)} €`}
              title={`Dal più economico in su, finché i fondi bastano. Restano ${formatCurrency(state.school.euros - buyAllPlan.total)}. I percorsi segreti restano a te.`}
            >
              <Icon name="spark" />
              <span className="upgrade-buy-all-text">
                <strong>
                  Compra tutto{buyAllPlan.count > 0
                    ? ` · ${buyAllPlan.count} ${buyAllPlan.count === 1 ? "livello" : "livelli"}`
                    : ""}
                </strong>
                <small>
                  {buyAllPlan.count > 0
                    ? `${formatStat(buyAllPlan.total)} € · restano ${formatStat(state.school.euros - buyAllPlan.total)} €`
                    : "Niente alla portata dei fondi"}
                </small>
              </span>
            </button>
          ) : null}
        </div>
      </header>

      <section className="upgrade-tree-section" aria-labelledby="upgrade-tree-title">
        <div className="upgrade-tree-heading">
          <h2 id="upgrade-tree-title" className="sr-only">Piano degli Upgrade</h2>
          <p>
            {completedCount} di {visibleCount} completati. Ogni livello comprato vale 1 punto nel suo ramo.
          </p>
          <div className="upgrade-tree-legend" aria-label="Legenda stati">
            <span><i className="available" />Da comprare ({availableCount})</span>
            <span><i className="unaffordable" />Fondi insufficienti</span>
            <span><i className="locked" />Bloccati</span>
            <span><i className="completed" />Completati</span>
          </div>
        </div>

        <details className="upgrade-benefits-summary" aria-label="Riepilogo dei bonus ottenuti dagli upgrade">
          <summary>Bonus totali <span>({upgradeBenefits.length})</span></summary>
          <ul>
            {upgradeBenefits.map((benefit) => (
              <li key={benefit.label}><span>{benefit.label}</span> {benefit.value}</li>
            ))}
          </ul>
        </details>

        <div className="upgrade-lanes">
          {UPGRADE_CATEGORIES.filter(
            (category) => isUpgradeCategoryVisible(state, category.id),
          ).map((category) => {
            const definitions = UPGRADE_DEFINITIONS.filter(
              (definition) => definition.category === category.id && !definition.hidden,
            );
            const isSecrets = category.id === "secrets";
            const branchComplete = !isSecrets && definitions.every(
              (definition) => state.upgrades[definition.id] >= definition.maxLevel,
            );
            // The wave lights up to the node after the last completed one.
            const lastCompleted = definitions.reduce(
              (last, definition, index) => state.upgrades[definition.id] >= definition.maxLevel ? index : last,
              -1,
            );
            const litTo = lastCompleted < 0 ? 0 : Math.min(lastCompleted + 1, definitions.length - 1);
            return (
              <section
                className={`upgrade-lane${branchComplete ? " complete" : ""}${isSecrets ? " secrets" : ""}`}
                key={category.id}
                aria-labelledby={`upgrade-branch-${category.id}`}
              >
                <div className="upgrade-lane-heading">
                  <div className="upgrade-lane-title">
                    <span className="upgrade-branch-icon"><Icon name={categoryIcons[category.id]} /></span>
                    <h3 id={`upgrade-branch-${category.id}`}>
                      {category.title}
                      {branchComplete ? <span className="sr-only"> (completo)</span> : null}
                    </h3>
                  </div>
                  <p>{getCategorySummary(state, category.id)}</p>
                  {isSecrets || category.id === "network" ? null : (
                    <span className="upgrade-lane-points">
                      <strong>{getUpgradeCategoryPoints(state.upgrades, category.id)}</strong> punti nel ramo
                    </span>
                  )}
                </div>
                <div className="upgrade-lane-track">
                  <div className="upgrade-lane-canvas">
                    <UpgradeLaneWave count={definitions.length} litTo={litTo} />
                    <ol className="upgrade-lane-nodes">
                      {definitions.map((definition, index) =>
                        isSecrets &&
                        !state.secretUpgradeDiscoveries.includes(
                          definition.id as SecretUpgradeId,
                        ) ? (
                          <MysteryUpgradeNode
                            key={definition.id}
                            index={index}
                            selected={selection?.upgradeId === definition.id}
                            onSelect={(anchor) => toggleDetails(definition.id, anchor)}
                          />
                        ) : (
                          <UpgradeNode
                            key={definition.id}
                            definition={definition}
                            index={index}
                            state={stateOverride}
                            selected={selection?.upgradeId === definition.id}
                            onSelect={(anchor) => toggleDetails(definition.id, anchor)}
                            onQuickBuy={recommendedUpgrade?.definition.id === definition.id ? buyCheapest : undefined}
                          />
                        )
                      )}
                    </ol>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {selectedDefinition && selection ? (
        <UpgradeDetailsDialog
          definition={selectedDefinition}
          state={stateOverride}
          anchor={selection.anchor}
          onClose={closeDetails}
          onBuy={() => onBuyUpgrade(selectedDefinition.id)}
        />
      ) : null}
    </main>
  );
}

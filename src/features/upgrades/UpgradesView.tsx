import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import {
  UPGRADE_CATEGORIES,
  UPGRADE_DEFINITIONS,
  canCancelMemberEnrollment,
  getAnnualFormTrainingLimit,
  getFirstIncompleteUpgradePrerequisite,
  getUpgradeCost,
  getUpgradeEffectMaximum,
  getUpgradeEffectTotal,
  hasAutomaticInstructorCertificates,
  hasFreeFormTraining,
  type UpgradeCategory,
  type UpgradeDefinition,
} from "../../content/upgrades";
import { getGameMonthName } from "../../game/calendar";
import { selectIncomePerMonth } from "../../game/selectors";
import type { GameState, UpgradeId } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

const categoryIcons: Record<UpgradeCategory, IconName> = {
  speed: "spark",
  charisma: "people",
  writing: "mail",
  welcome: "contact",
  social: "people",
  equipment: "settings",
  organization: "tasks",
  instructors: "people",
};

const numberFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatUpgradePercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getUpgradeBenefitsSummary(state: GameState) {
  const benefits = [
    { label: "Caratteri per input", value: formatNumber(state.player.writingPower) },
  ];
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
  addPercentage("Prenotazioni", "bookingMultiplier");
  addPercentage("Iscrizioni", "enrollmentMultiplier");
  addPercentage("Produzione Social", "socialMultiplier");
  addPercentage("Automazione", "automationMultiplier");
  addPercentage("Entrate", "incomeMultiplier");
  addPercentage("Usura", "equipmentWearReduction", "−");
  addAmount("Spade", "totalSwords");
  addAmount("Forme annue", "annualFormCapacity");
  addAmount("Rami per Istruttore", "instructorBranchCapacity");
  addAmount("Allievi per Istruttore", "instructorStudentCapacity");
  addPercentage("Velocità insegnamento", "instructorTeachingSpeed");

  const agonistCourseTier = getUpgradeEffectTotal(state.upgrades, "agonistCourseTier");
  if (agonistCourseTier > 0) {
    benefits.push({ label: "Arena Tecnica", value: `livello ${agonistCourseTier}` });
  }
  if (canCancelMemberEnrollment(state.upgrades)) {
    benefits.push({ label: "Annullamento iscrizioni", value: "Sbloccato" });
  }
  if (hasAutomaticInstructorCertificates(state.upgrades)) {
    benefits.push({ label: "Attestati collaboratori", value: "Automatici" });
  }
  if (hasFreeFormTraining(state.upgrades)) {
    benefits.push({ label: "Costi di formazione", value: "Gratuiti" });
  }

  return benefits;
}

function getCategorySummary(state: GameState, category: UpgradeCategory) {
  switch (category) {
    case "speed":
      return `${state.player.writingPower} caratteri per input`;
    case "charisma":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier") * 100)}% contatti`;
    case "writing":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "bookingMultiplier") * 100)}% prenotazioni`;
    case "welcome":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier") * 100)}% iscrizioni`;
    case "social":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "socialMultiplier") * 100)}% produzione`;
    case "equipment":
      return `${state.equipment.totalSwords} spade · -${Math.round(getUpgradeEffectTotal(state.upgrades, "equipmentWearReduction") * 100)}% usura`;
    case "organization":
      return `+${Math.round(getUpgradeEffectTotal(state.upgrades, "automationMultiplier") * 100)}% automazione`;
    case "instructors":
      return `Forme annue ${getAnnualFormTrainingLimit(state.upgrades)}/${1 + getUpgradeEffectMaximum("annualFormCapacity")} · Polivalenza ${state.upgrades["instructor-versatility"]}/2`;
  }
}

type UpgradeStatus = "locked" | "available" | "completed";

function getUpgradeLockReason(state: GameState, definition: UpgradeDefinition) {
  if (state.school.historicMembers < definition.requiredHistoricMembers) {
    return `Serve Fama della scuola ${definition.requiredHistoricMembers}`;
  }
  const prerequisite = getFirstIncompleteUpgradePrerequisite(
    state.upgrades,
    definition,
  );
  return prerequisite ? `Completa prima ${prerequisite.title}` : null;
}

function getUpgradeStatus(state: GameState, definition: UpgradeDefinition): UpgradeStatus {
  const level = state.upgrades[definition.id];
  if (level >= definition.maxLevel) return "completed";
  return getUpgradeLockReason(state, definition) ? "locked" : "available";
}

function UpgradeNode({
  definition,
  state,
  selected,
  onSelect,
}: {
  definition: UpgradeDefinition;
  state: GameState;
  selected: boolean;
  onSelect: (anchor: HTMLButtonElement) => void;
}) {
  const level = state.upgrades[definition.id];
  const status = getUpgradeStatus(state, definition);
  const lockReason = getUpgradeLockReason(state, definition);
  const cost = getUpgradeCost(definition, level, state.network.schools.length);
  const unaffordable = status === "available" && state.school.euros < cost;
  const stateLabel = status === "locked"
    ? `bloccato, ${lockReason?.toLocaleLowerCase("it")}`
    : status === "completed"
      ? "completato"
      : unaffordable
        ? "disponibile, saldo insufficiente"
        : "disponibile";

  return (
    <li className="upgrade-node-item">
      <button
        type="button"
        className={`upgrade-node ${status}${unaffordable ? " unaffordable" : ""}${selected ? " selected" : ""}`}
        onClick={(event) => onSelect(event.currentTarget)}
        aria-label={`Apri dettagli ${definition.title}: livello ${level} di ${definition.maxLevel}, ${stateLabel}`}
        aria-pressed={selected}
      >
        <span className="upgrade-node-icon" aria-hidden="true">
          {status === "completed" ? <span className="upgrade-node-check">✓</span> : <Icon name={categoryIcons[definition.category]} />}
        </span>
        <span className="upgrade-node-level">Livello {level}/{definition.maxLevel}</span>
        <strong>{definition.title}</strong>
      </button>
    </li>
  );
}

function UpgradeDetailsDialog({
  definition,
  state,
  anchor,
  onClose,
  onBuy,
}: {
  definition: UpgradeDefinition;
  state: GameState;
  anchor: HTMLButtonElement;
  onClose: () => void;
  onBuy: () => void;
}) {
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
  const cost = getUpgradeCost(definition, level, state.network.schools.length);
  const lockReason = getUpgradeLockReason(state, definition);
  const completed = level >= definition.maxLevel;
  const affordable = state.school.euros >= cost;
  const canBuy = !lockReason && affordable && !completed;
  const statusText = completed
    ? "Potenziamento completato"
    : lockReason
      ? lockReason
      : !affordable
        ? `Mancano ${formatCurrency(cost - state.school.euros)}`
        : "Pronto per il livello successivo";

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
            <span>{UPGRADE_CATEGORIES.find((category) => category.id === definition.category)?.title}</span>
            <h2 id="upgrade-dialog-title">{definition.title}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="upgrade-dialog-close" onClick={onClose} aria-label="Chiudi dettagli">×</button>
        </header>

        <p id="upgrade-dialog-description">{definition.description}</p>

        <dl className="upgrade-dialog-stats">
          <div><dt>Livello attuale</dt><dd>{level}/{definition.maxLevel}</dd></div>
          <div><dt>Effetto per livello</dt><dd>{definition.effectLabel}</dd></div>
          <div><dt>Costo</dt><dd>{completed ? "—" : formatCurrency(cost)}</dd></div>
          <div><dt>Fama richiesta</dt><dd>{definition.requiredHistoricMembers || "Nessuna"}</dd></div>
        </dl>

        <p className={`upgrade-dialog-status${canBuy || completed ? " positive" : ""}`}>
          <span aria-hidden="true">{canBuy || completed ? "✓" : "!"}</span> {statusText}
        </p>
        <button type="button" className="upgrade-dialog-buy" onClick={onBuy} disabled={!canBuy}>
          {completed ? "Completato" : "Potenzia"}
        </button>
      </div>
    </section>
  );
}

export function UpgradesView({
  state,
  onBuyUpgrade,
}: {
  state: GameState;
  onBuyUpgrade: (upgradeId: UpgradeId) => void;
}) {
  const [selection, setSelection] = useState<{
    upgradeId: UpgradeId;
    anchor: HTMLButtonElement;
  } | null>(null);
  const incomePerMonth = selectIncomePerMonth(state);
  const monthName = getGameMonthName(state.school.currentMonth);
  const selectedDefinition = selection
    ? UPGRADE_DEFINITIONS.find((definition) => definition.id === selection.upgradeId) ?? null
    : null;
  const closeDetails = useCallback(() => {
    const anchor = selection?.anchor;
    setSelection(null);
    window.requestAnimationFrame(() => anchor?.focus());
  }, [selection]);
  let availableCount = 0;
  let completedCount = 0;
  let recommendedUpgrade: { definition: UpgradeDefinition; cost: number } | undefined;
  for (const definition of UPGRADE_DEFINITIONS) {
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
      state.network.schools.length,
    );
    if (!recommendedUpgrade || cost < recommendedUpgrade.cost) {
      recommendedUpgrade = { definition, cost };
    }
  }
  const upgradeBenefits = getUpgradeBenefitsSummary(state);
  const recommendedAffordable = recommendedUpgrade
    ? state.school.euros >= recommendedUpgrade.cost
    : false;

  return (
    <main className="overview-view shop-view">
      <header className="upgrade-page-header">
        <Icon name="spark" />
        <div><h1>Upgrade</h1><p>Sviluppa la scuola seguendo i rami del piano di crescita</p></div>
        <div className="upgrade-page-summary" aria-label="Risorse per i potenziamenti">
          <div><span>Entrate di {monthName}</span><strong>{formatCurrency(incomePerMonth)} <small>al mese</small></strong></div>
          <div><span>Disponibilità attuale</span><strong>{formatCurrency(state.school.euros)}</strong></div>
        </div>
      </header>

      <section className="upgrade-tree-section" aria-labelledby="upgrade-tree-title">
        <div className="upgrade-tree-heading">
          <div>
            <h2 id="upgrade-tree-title">Piano dei potenziamenti</h2>
            <p>Seleziona un nodo per vedere effetto, costo e requisiti.</p>
          </div>
          <div className="upgrade-tree-legend" aria-label="Legenda stati">
            <span><i className="available" />{availableCount} disponibili</span>
            <span><i className="locked" />Bloccati</span>
            <span><i className="completed" />{completedCount} completati</span>
          </div>
        </div>

        <div className="upgrade-benefits-summary" aria-label="Riepilogo dei bonus ottenuti dagli upgrade">
          <strong>Bonus totali</strong>
          <ul>
            {upgradeBenefits.map((benefit) => (
              <li key={benefit.label}><span>{benefit.label}:</span> {benefit.value}</li>
            ))}
          </ul>
        </div>

        <div className="upgrade-tree-scroll" tabIndex={0} aria-label="Diagramma dei potenziamenti, scorribile orizzontalmente">
          <div className="upgrade-tree-canvas">
            <div className="upgrade-tree-root">
              <span aria-hidden="true"><Icon name="spark" /></span>
              <strong>Crescita<br />della scuola</strong>
              <section className="upgrade-recommendation" aria-labelledby="upgrade-recommendation-title">
                <h3 id="upgrade-recommendation-title">Upgrade raccomandato</h3>
                {recommendedUpgrade ? (
                  <>
                    <strong>{recommendedUpgrade.definition.title}</strong>
                    <small>
                      Livello {state.upgrades[recommendedUpgrade.definition.id] + 1}
                      {" · "}{formatCurrency(recommendedUpgrade.cost)}
                    </small>
                    <button
                      type="button"
                      onClick={() => onBuyUpgrade(recommendedUpgrade.definition.id)}
                      disabled={!recommendedAffordable}
                      aria-label={`Potenzia ${recommendedUpgrade.definition.title}`}
                    >
                      Potenzia
                    </button>
                    {!recommendedAffordable ? (
                      <small>Mancano {formatCurrency(recommendedUpgrade.cost - state.school.euros)}</small>
                    ) : null}
                  </>
                ) : (
                  <small>Nessun upgrade disponibile</small>
                )}
              </section>
            </div>
            <div className="upgrade-tree-branches">
              {UPGRADE_CATEGORIES.map((category) => {
                const definitions = UPGRADE_DEFINITIONS.filter(
                  (definition) => definition.category === category.id,
                );
                return (
                  <section className="upgrade-branch" key={category.id} aria-labelledby={`upgrade-branch-${category.id}`}>
                    <div className="upgrade-branch-heading">
                      <span className="upgrade-branch-icon"><Icon name={categoryIcons[category.id]} /></span>
                      <div>
                        <h3 id={`upgrade-branch-${category.id}`}>{category.title}</h3>
                        <p>{getCategorySummary(state, category.id)}</p>
                      </div>
                    </div>
                    <ol className="upgrade-branch-nodes">
                      {definitions.map((definition) => (
                        <UpgradeNode
                          key={definition.id}
                          definition={definition}
                          state={state}
                          selected={selection?.upgradeId === definition.id}
                          onSelect={(anchor) => setSelection({ upgradeId: definition.id, anchor })}
                        />
                      ))}
                    </ol>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedDefinition && selection ? (
        <UpgradeDetailsDialog
          definition={selectedDefinition}
          state={state}
          anchor={selection.anchor}
          onClose={closeDetails}
          onBuy={() => onBuyUpgrade(selectedDefinition.id)}
        />
      ) : null}
    </main>
  );
}

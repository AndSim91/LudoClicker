import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  GADGET_DEFINITIONS,
  GADGET_PRODUCT_ORDER,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
} from "../../content/gadgets";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  getGadgetAudience,
  getGadgetProductivity,
  getGadgetWorkProgress,
} from "../../game/gadgetEconomy";
import type { GadgetProductId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { GadgetRhythmGame } from "./GadgetRhythmGame";

const numberFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

function ProductQuality({ quality }: { quality: number }) {
  return (
    <div className="gadget-quality" aria-label={`Qualità ${quality} su 100`}>
      <span><strong>{quality}%</strong><small>Qualità</small></span>
      <ProgressBar label="Qualità massima" value={quality} />
    </div>
  );
}

function GadgetProductCard({
  state,
  productId,
  onStartProject,
  onStartRevision,
  onStartMinigame,
  onAccept,
}: {
  state: GameState;
  productId: GadgetProductId;
  onStartProject: (productId: GadgetProductId) => void;
  onStartRevision: (productId: GadgetProductId) => void;
  onStartMinigame: (productId: GadgetProductId) => void;
  onAccept: (productId: GadgetProductId) => void;
}) {
  const definition = GADGET_DEFINITIONS[productId];
  const product = state.gadgets.products[productId];
  const work = state.gadgets.activeWork?.productId === productId
    ? state.gadgets.activeWork
    : undefined;
  const minigame = state.gadgets.minigame?.productId === productId
    ? state.gadgets.minigame
    : undefined;
  const slotBusy = Boolean(state.gadgets.activeWork || state.gadgets.minigame);
  const revisionCost = getGadgetRevisionCost(productId);
  const previousDefinition = definition.previousProductId
    ? GADGET_DEFINITIONS[definition.previousProductId]
    : undefined;

  if (!product.unlocked) {
    return (
      <article className="gadget-product-card is-locked">
        <div className="gadget-product-symbol" aria-hidden="true">?</div>
        <div className="gadget-product-heading">
          <span>Progetto bloccato</span>
          <h2>{definition.name}</h2>
          <p>
            {previousDefinition
              ? `Si sblocca dopo ${GADGET_PROJECT_UNLOCK_SALES} vendite di ${previousDefinition.name}.`
              : "Non ancora disponibile."}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className={`gadget-product-card${product.accepted ? " is-selling" : ""}`}>
      <div className="gadget-product-symbol" aria-hidden="true">
        {definition.name.slice(0, 2).toLocaleUpperCase("it-IT")}
      </div>
      <div className="gadget-product-heading">
        <span>{product.accepted ? "In catalogo" : product.projectPurchased ? "Prototipo" : "Progetto disponibile"}</span>
        <h2>{definition.name}</h2>
        <p>{definition.description}</p>
      </div>

      {product.prototypeCompleted ? <ProductQuality quality={product.quality} /> : null}

      {product.accepted ? (
        <div className="gadget-sales-stats">
          <span><small>Venduti</small><strong>{product.unitsSold.toLocaleString("it-IT")}</strong></span>
          <span><small>Guadagnato</small><strong>{formatCurrency(product.totalProfit)}</strong></span>
        </div>
      ) : null}

      <div className="gadget-product-status">
        {work ? (
          <>
            <span className="gadget-status-pill is-working">
              {work.kind === "development" ? "Progettazione in corso" : "Revisione in corso"}
            </span>
            {getGadgetProductivity(state) <= 0 ? <small>In pausa: assegna almeno un Collaboratore ai Gadget.</small> : null}
          </>
        ) : minigame?.status === "ready" ? (
          <span className="gadget-status-pill is-ready">Prova qualità pronta</span>
        ) : product.accepted && product.quality === 0 ? (
          <span className="gadget-status-pill is-warning">Non vendibile</span>
        ) : product.accepted ? (
          <span className="gadget-status-pill is-selling">Vendita automatica attiva</span>
        ) : product.prototypeCompleted ? (
          <span className="gadget-status-pill is-ready">In attesa di approvazione</span>
        ) : null}
      </div>

      <div className="gadget-product-actions">
        {!product.projectPurchased ? (
          <button
            type="button"
            className="primary"
            disabled={slotBusy || state.school.euros < definition.projectCost}
            onClick={() => onStartProject(productId)}
          >
            Avvia progetto · {formatCurrency(definition.projectCost)}
          </button>
        ) : minigame?.status === "ready" ? (
          <button type="button" className="primary" onClick={() => onStartMinigame(productId)}>
            Avvia prova qualità
          </button>
        ) : work || minigame ? null : !product.prototypeCompleted ? null : !product.accepted ? (
          <>
            <button type="button" className="primary" onClick={() => onAccept(productId)}>
              Metti in vendita
            </button>
            {product.quality < 100 ? (
              <button
                type="button"
                disabled={slotBusy || state.school.euros < revisionCost}
                onClick={() => onStartRevision(productId)}
              >
                Revisiona · {formatCurrency(revisionCost)}
              </button>
            ) : null}
          </>
        ) : product.quality < 100 ? (
          <button
            type="button"
            disabled={slotBusy || state.school.euros < revisionCost}
            onClick={() => onStartRevision(productId)}
          >
            Migliora qualità · {formatCurrency(revisionCost)}
          </button>
        ) : (
          <span className="gadget-quality-complete"><Icon name="check" /> Qualità massima</span>
        )}
      </div>
    </article>
  );
}

export function GadgetsView({
  state: stateOverride,
  onStartProject,
  onStartRevision,
  onStartMinigame,
  onCompleteMinigame,
  onDismissMinigameResult,
  onAccept,
}: {
  state?: GameState;
  onStartProject: (productId: GadgetProductId) => void;
  onStartRevision: (productId: GadgetProductId) => void;
  onStartMinigame: (productId: GadgetProductId) => void;
  onCompleteMinigame: (productId: GadgetProductId, score: number) => void;
  onDismissMinigameResult: (productId: GadgetProductId) => void;
  onAccept: (productId: GadgetProductId) => void;
}) {
  const state = useGameStateSlices(
    ["collaborators", "gadgets", "school", "unlocks", "upgrades"],
    stateOverride,
  );
  const productivity = getGadgetProductivity(state);
  const activeWork = state.gadgets.activeWork;
  const workProgress = getGadgetWorkProgress(state);
  const minigame = state.gadgets.minigame;
  const minigameProduct = minigame
    ? state.gadgets.products[minigame.productId]
    : undefined;

  return (
    <main className="overview-view gadget-view">
      <header className="gadget-view-heading">
        <Icon name="gift" />
        <div>
          <h1>Gadget</h1>
          <p>Progetta i prodotti della scuola e affidane la vendita ai Collaboratori.</p>
        </div>
      </header>

      <section className="gadget-overview" aria-label="Riepilogo Gadget">
        <div>
          <small>Pubblico raggiungibile</small>
          <strong>{getGadgetAudience(state).toLocaleString("it-IT")}</strong>
        </div>
        <div>
          <small>Produttività Gadget</small>
          <strong>{numberFormatter.format(productivity)}</strong>
        </div>
        <div className="gadget-overview-work">
          <small>Laboratorio</small>
          {activeWork && workProgress !== undefined ? (
            <>
              <strong>
                {activeWork.kind === "development" ? "Progetto" : "Revisione"} {GADGET_DEFINITIONS[activeWork.productId].name}
              </strong>
              <ProgressBar
                label={`Avanzamento ${GADGET_DEFINITIONS[activeWork.productId].name}`}
                value={workProgress}
                paused={productivity <= 0}
              />
            </>
          ) : minigame?.status === "ready" ? (
            <strong>Prova qualità pronta</strong>
          ) : (
            <strong>Libero</strong>
          )}
        </div>
        <p>I potenziamenti del settore si acquistano nella schermata Upgrade.</p>
      </section>

      <section className="gadget-catalog" aria-label="Catalogo Gadget">
        {GADGET_PRODUCT_ORDER.map((productId) => (
          <GadgetProductCard
            key={productId}
            state={state}
            productId={productId}
            onStartProject={onStartProject}
            onStartRevision={onStartRevision}
            onStartMinigame={onStartMinigame}
            onAccept={onAccept}
          />
        ))}
      </section>

      {minigame && minigame.status !== "ready" && minigameProduct ? (
        <GadgetRhythmGame
          key={`${minigame.productId}-${minigame.seed}`}
          minigame={minigame}
          quality={minigameProduct.quality}
          accepted={minigameProduct.accepted}
          revisionCost={getGadgetRevisionCost(minigame.productId)}
          canAffordRevision={state.school.euros >= getGadgetRevisionCost(minigame.productId)}
          onComplete={(score) => onCompleteMinigame(minigame.productId, score)}
          onAccept={() => onAccept(minigame.productId)}
          onRevision={() => onStartRevision(minigame.productId)}
          onContinue={() => onDismissMinigameResult(minigame.productId)}
        />
      ) : null}
    </main>
  );
}

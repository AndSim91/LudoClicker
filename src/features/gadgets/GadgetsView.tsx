import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import {
  GADGET_DEFINITIONS,
  GADGET_PRODUCT_ORDER,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
} from "../../content/gadgets";
import {
  GADGET_RARITIES,
  getGadgetRarityClassName,
} from "../../content/gadgetRarities";
import { useGameStateSlices } from "../../game/GameStateContext";
import {
  getGadgetAudience,
  getGadgetProductivity,
  getGadgetWorkProgress,
} from "../../game/gadgetEconomy";
import {
  canRollNextGadgetRarity,
  getHighestUnlockedGadgetRarity,
  getUnlockedGadgetRarities,
} from "../../game/gadgetRarity";
import type {
  GadgetProductId,
  GadgetProductState,
  GameState,
} from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import {
  GadgetProductArtwork,
  GadgetWorkshopArtwork,
} from "./GadgetArtwork";
import { GadgetRhythmGame } from "./GadgetRhythmGame";

const numberFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

function GadgetRarityRows({ product }: { product: GadgetProductState }) {
  const rarities = getUnlockedGadgetRarities(product);
  const highestRarity = getHighestUnlockedGadgetRarity(product);
  return (
    <div className="gadget-rarity-list" aria-label="Rarità sbloccate">
      {rarities.map((rarity) => {
        const rarityState = product.rarities[rarity];
        return (
          <div
            className={`gadget-rarity-row ${getGadgetRarityClassName(rarity)}${
              rarity === highestRarity ? " is-current" : ""
            }`}
            key={rarity}
          >
            <div className="gadget-rarity-identity">
              <span aria-hidden="true" />
              <strong>{GADGET_RARITIES[rarity].label}</strong>
            </div>
            <div
              className="gadget-rarity-quality"
              aria-label={`${GADGET_RARITIES[rarity].label}: qualità ${rarityState.quality} su 100`}
            >
              <span><small>Qualità</small><strong>{rarityState.quality}%</strong></span>
              <ProgressBar
                label={`Qualità ${GADGET_RARITIES[rarity].label}`}
                value={rarityState.quality}
              />
            </div>
            <span className="gadget-rarity-stat">
              <small>Venduti</small>
              <strong>{rarityState.unitsSold.toLocaleString("it-IT")}</strong>
            </span>
            <span className="gadget-rarity-stat">
              <small>Guadagnato</small>
              <strong>{formatCurrency(rarityState.totalProfit)}</strong>
            </span>
          </div>
        );
      })}
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
  const highestRarity = getHighestUnlockedGadgetRarity(product);
  const highestRarityState = product.rarities[highestRarity];
  const canRollNextRarity = product.prototypeCompleted &&
    canRollNextGadgetRarity(state, productId, highestRarity);
  const canImproveQuality = product.prototypeCompleted && (
    highestRarityState.quality < 100 || canRollNextRarity
  );
  const revisionCost = getGadgetRevisionCost(productId, highestRarity);
  const previousDefinition = definition.previousProductId
    ? GADGET_DEFINITIONS[definition.previousProductId]
    : undefined;

  if (!product.unlocked) {
    return (
      <article className="gadget-product-card is-locked">
        <span className="gadget-product-rail" aria-hidden="true" />
        <GadgetProductArtwork productId={productId} locked />
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

  const visualState = product.accepted
    ? highestRarityState.quality > 0 ? "is-selling" : "is-warning"
    : work ? "is-working"
      : minigame?.status === "ready" || product.prototypeCompleted
        ? "is-prototype"
        : "is-available";

  return (
    <article className={`gadget-product-card ${visualState} ${getGadgetRarityClassName(highestRarity)}${
      product.prototypeCompleted ? " has-rarity" : ""
    }`}>
      <span className="gadget-product-rail" aria-hidden="true" />
      <GadgetProductArtwork productId={productId} rarity={highestRarity} />
      <div className="gadget-product-heading">
        <span>{product.accepted ? "In catalogo" : product.projectPurchased ? "Prototipo" : "Progetto disponibile"}</span>
        <h2>{definition.name}</h2>
        <p>{definition.description}</p>
      </div>

      {product.prototypeCompleted ? <GadgetRarityRows product={product} /> : null}

      <div className="gadget-product-status">
        {work ? (
          <>
            <span className="gadget-status-label is-working">
              {work.kind === "development" ? "Progettazione in corso" : "Revisione in corso"}
            </span>
            {getGadgetProductivity(state) <= 0 ? <small>In pausa: assegna almeno un Collaboratore ai Gadget.</small> : null}
          </>
        ) : minigame?.status === "ready" ? (
          <span className="gadget-status-label is-ready">Prova qualità pronta</span>
        ) : product.accepted && highestRarityState.quality === 0 ? (
          <span className="gadget-status-label is-warning">Non vendibile</span>
        ) : product.accepted ? (
          <span className="gadget-status-label is-selling">Vendita automatica attiva</span>
        ) : product.prototypeCompleted ? (
          <span className="gadget-status-label is-ready">In attesa di approvazione</span>
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
            {canImproveQuality ? (
              <button
                type="button"
                disabled={slotBusy || state.school.euros < revisionCost}
                onClick={() => onStartRevision(productId)}
              >
                Revisiona · {formatCurrency(revisionCost)}
              </button>
            ) : null}
          </>
        ) : canImproveQuality ? (
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
  const minigameHighestRarity = minigameProduct
    ? getHighestUnlockedGadgetRarity(minigameProduct)
    : "common";
  const minigameQuality = minigameProduct
    ? minigameProduct.rarities[minigameHighestRarity].quality
    : 0;
  const minigameCanRevise = Boolean(
    minigame && minigameProduct && (
      minigameQuality < 100 ||
      canRollNextGadgetRarity(state, minigame.productId, minigameHighestRarity)
    ),
  );
  const minigameRevisionCost = minigame
    ? getGadgetRevisionCost(minigame.productId, minigameHighestRarity)
    : 0;

  return (
    <main className="overview-view gadget-view">
      <header className="gadget-view-heading">
        <Icon name="gift" />
        <div>
          <h1>Gadget</h1>
          <p>Progetta i prodotti della scuola e affidane la vendita ai Collaboratori.</p>
        </div>
        <GadgetWorkshopArtwork />
      </header>

      <section className="gadget-overview" aria-label="Riepilogo Gadget">
        <div className="gadget-overview-item">
          <span className="gadget-overview-icon" aria-hidden="true"><Icon name="people" /></span>
          <span>
            <small>Pubblico raggiungibile</small>
            <strong>{getGadgetAudience(state).toLocaleString("it-IT")}</strong>
          </span>
        </div>
        <div className="gadget-overview-item">
          <span className="gadget-overview-icon" aria-hidden="true"><Icon name="settings" /></span>
          <span>
            <small>Produttività Gadget</small>
            <strong>{numberFormatter.format(productivity)}</strong>
          </span>
        </div>
        <div className="gadget-overview-item gadget-overview-work">
          <span className="gadget-overview-icon" aria-hidden="true"><Icon name="flask" /></span>
          <span>
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
          </span>
        </div>
        <p>
          <Icon name="info" />
          Oltre il pubblico raggiungibile restano possibili vendite occasionali,
          ma molto più lente. I potenziamenti del settore si acquistano nella
          schermata Upgrade.
        </p>
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
          quality={minigameQuality}
          accepted={minigameProduct.accepted}
          revisionCost={minigameRevisionCost}
          canRevise={minigameCanRevise}
          canAffordRevision={state.school.euros >= minigameRevisionCost}
          onComplete={(score) => onCompleteMinigame(minigame.productId, score)}
          onAccept={() => onAccept(minigame.productId)}
          onRevision={() => onStartRevision(minigame.productId)}
          onContinue={() => onDismissMinigameResult(minigame.productId)}
        />
      ) : null}
    </main>
  );
}

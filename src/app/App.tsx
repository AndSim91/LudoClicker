import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Icon } from "../components/common/Icon";
import { ProfileNameDialog } from "../components/ProfileNameDialog";
import { AppRail, type AppView } from "../components/outlook-shell/AppRail";
import { CommandBar } from "../components/outlook-shell/CommandBar";
import { Composer } from "../components/outlook-shell/Composer";
import { FolderPane, type MailFolder } from "../components/outlook-shell/FolderPane";
import { MessageDetail } from "../components/outlook-shell/MessageDetail";
import { MessageList } from "../components/outlook-shell/MessageList";
import { SentMailDetail } from "../components/outlook-shell/SentMailDetail";
import { TitleBar } from "../components/outlook-shell/TitleBar";
import { OverviewView } from "../features/OverviewView";
import { AdminEmailView } from "../features/admin/AdminEmailView";
import { EventsView } from "../features/events/EventsView";
import { PeopleView } from "../features/people/PeopleView";
import { TournamentsView } from "../features/tournaments/TournamentsView";
import { GadgetsView } from "../features/gadgets/GadgetsView";
import { LudoWikiView } from "../features/ludowiki/LudoWikiView";
import { UpgradesView } from "../features/upgrades/UpgradesView";
import { DayPanel } from "../features/day-panel/DayPanel";
import { TutorialLayer } from "../features/tutorial/TutorialLayer";
import { useTutorialController } from "../features/tutorial/useTutorialController";
import {
  GameStateStoreProvider,
  useGameStateStore,
} from "../game/GameStateContext";
import { GameTimeProvider } from "../game/GameTimeProvider";
import { crashReporter } from "../game/crashReporting";
import { getAvailableSwords } from "../game/equipment";
import { getMessageThreadKey } from "../game/messages";
import { useGameEngine } from "../game/useGameEngine";
import { getAvailableStandardLegendaryProfiles } from "../game/legendaryAvailability";
import { isGameAreaUnlocked } from "../game/progression";
import { exportGame, importGame, resetGame, saveGame } from "../game/save";
import {
  selectAvailableContacts,
  selectContactsAwaitingEmail,
} from "../game/selectors";
import type {
  AcquisitionEvent,
  CollaboratorAssignment,
  CollaboratorMasteryRole,
  FormId,
  GadgetProductId,
  RockPaperScissorsChoice,
  ReptileSectorAssignments,
  UpgradeId,
} from "../game/types";
import { APP_VERSION } from "../shared/appVersion";
import { useAppPreferences } from "./useAppPreferences";

const StableTitleBar = memo(TitleBar);
const StableAppRail = memo(AppRail);
const StableFolderPane = memo(FolderPane);
const StableMessageList = memo(MessageList);
const StableSentMailDetail = memo(SentMailDetail);
const StableComposer = memo(Composer);
const StableUpgradesView = memo(UpgradesView);
const StableEventsView = memo(EventsView);
const StablePeopleView = memo(PeopleView);
const StableTournamentsView = memo(TournamentsView);
const StableGadgetsView = memo(GadgetsView);
const StableLudoWikiView = memo(LudoWikiView);
const StableOverviewView = memo(OverviewView);
const StableDayPanel = memo(DayPanel);

function targetConsumesKeyboard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}

function isWindowsKey(event: KeyboardEvent): boolean {
  return (
    event.key === "Meta" ||
    event.key === "OS" ||
    event.key === "Win" ||
    event.key === "Shift" ||
    event.code === "MetaLeft" ||
    event.code === "MetaRight" ||
    event.code === "ShiftLeft" ||
    event.code === "ShiftRight"
  );
}

export function App() {
  const {
    state,
    dispatch,
    getGameNow,
    getWallNow,
    getPersistableState,
    gameSpeed,
    setGameSpeed,
    isPaused,
    togglePause,
    setTutorialPaused,
    setGadgetPaused,
    setReptilePaused,
    saveStatus,
    saveNow,
  } = useGameEngine();
  const gameStateStore = useGameStateStore(state);
  const [view, setView] = useState<AppView>("mail");
  const [mailFolder, setMailFolder] = useState<MailFolder>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null);
  const { reduceMotion, setReduceMotion, darkMode, setDarkMode } = useAppPreferences();
  const tournamentMessagesVisible = isGameAreaUnlocked("tournaments", state);
  const visibleInboxMessages = useMemo(
    () => tournamentMessagesVisible
      ? state.messages
      : state.messages.filter((message) => getMessageThreadKey(message) !== "tournaments"),
    [state.messages, tournamentMessagesVisible],
  );
  const selectedMessage = useMemo(
    () => visibleInboxMessages.find((message) => message.id === selectedMessageId),
    [selectedMessageId, visibleInboxMessages],
  );
  const selectedSentEmail = useMemo(
    () => state.emails.find((email) => email.id === selectedSentEmailId),
    [selectedSentEmailId, state.emails],
  );
  const hasActiveGadgetMinigame = state.unlocks.gadget &&
    (state.gadgets.minigame?.status === "running" ||
      state.gadgets.minigame?.status === "result");
  const reptileStatus = state.tournaments.reptile.activeEdition?.status;
  const hasBlockingReptileFlow =
    (reptileStatus === "minigame" &&
      state.tournaments.reptile.activeEdition?.minigame.status === "running") ||
    reptileStatus === "presenting";
  const activeView: AppView = hasActiveGadgetMinigame
    ? "gadget"
    : hasBlockingReptileFlow
      ? "tournaments"
    : view === "admin" || view === "ludowiki"
      ? import.meta.env.DEV
        ? view
        : "mail"
      : isGameAreaUnlocked(view, state)
        ? view
        : "mail";

  useEffect(() => {
    crashReporter.updateView(activeView);
  }, [activeView]);
  const navigateForTutorial = useCallback((targetView: string) => {
    if (targetView !== "mail") return;
    setView("mail");
    setMailFolder("inbox");
    setSelectedMessageId(null);
    setSelectedSentEmailId(null);
  }, []);
  const tutorial = useTutorialController({
    state,
    activeView,
    dispatch,
    onNavigate: navigateForTutorial,
  });

  useLayoutEffect(() => {
    setTutorialPaused(tutorial.shouldPauseGame);
  }, [setTutorialPaused, tutorial.shouldPauseGame]);

  useLayoutEffect(() => {
    setGadgetPaused(state.gadgets.minigame?.status === "running");
  }, [setGadgetPaused, state.gadgets.minigame?.status]);

  useLayoutEffect(() => {
    setReptilePaused(hasBlockingReptileFlow);
  }, [hasBlockingReptileFlow, setReptilePaused]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        activeView !== "mail" ||
        mailFolder !== "inbox" ||
        selectedMessageId !== null ||
        !state.profile.displayName.trim() ||
        tutorial.isBlockingInput ||
        event.repeat ||
        isWindowsKey(event) ||
        targetConsumesKeyboard(event.target)
      )
        return;
      dispatch({ type: "WRITE", now: getGameNow() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeView,
    dispatch,
    getGameNow,
    mailFolder,
    selectedMessageId,
    state.profile.displayName,
    tutorial.isBlockingInput,
  ]);

  const write = useCallback(
    () => dispatch({ type: "WRITE", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const buyOfficialSwords = useCallback(
    (amount: 1 | 10 | 100) =>
      dispatch({ type: "BUY_OFFICIAL_SWORD", amount, now: getGameNow() }),
    [dispatch, getGameNow],
  );

  const selectMessage = useCallback((messageId: string | null) => {
    if (messageId) dispatch({ type: "MARK_MESSAGE_READ", messageId });
    setSelectedMessageId(messageId);
  }, [dispatch]);
  const selectFolder = useCallback((folder: MailFolder) => {
    setMailFolder(folder);
    setSelectedMessageId(null);
    if (folder === "sent") {
      const latestSent = state.emails
        .filter(
          (email) =>
            email.status !== "writing" &&
            email.status !== "readyToSend" &&
            email.status !== "sending",
        )
        .at(-1);
      setSelectedSentEmailId(latestSent?.id ?? null);
    }
  }, [state.emails]);
  const openComposer = useCallback(() => {
    setView("mail");
    setMailFolder("inbox");
    setSelectedMessageId(null);
  }, []);
  const exportSave = useCallback(() => {
    const blob = new Blob([exportGame(getPersistableState())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oggetto-nuovi-iscritti-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [getPersistableState]);
  const importSave = useCallback((raw: string) => {
    const imported = importGame(raw);
    if (!imported) return false;
    dispatch({ type: "REPLACE_STATE", state: imported });
    saveGame(imported);
    return true;
  }, [dispatch]);
  const resetSave = useCallback(() => {
    dispatch({ type: "REPLACE_STATE", state: resetGame() });
    setView("mail");
  }, [dispatch]);
  const updateProfileName = useCallback((displayName: string) => {
    dispatch({ type: "UPDATE_PROFILE_NAME", displayName });
  }, [dispatch]);
  const forceGameUpdate = useCallback(() => {
    if (!saveNow()) return;
    const updateUrl = new URL(window.location.href);
    updateUrl.searchParams.set("refresh", Date.now().toString());
    window.location.replace(updateUrl);
  }, [saveNow]);

  const openMembers = useCallback(() => setView("contacts"), []);
  const markAllMessagesRead = useCallback(
    () => dispatch({ type: "MARK_ALL_MESSAGES_READ" }),
    [dispatch],
  );
  const setAutomaticEmailSending = useCallback(
    (enabled: boolean) =>
      dispatch({ type: "SET_AUTOMATIC_EMAIL_SENDING", enabled, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const buyUpgrade = useCallback(
    (upgradeId: UpgradeId) => dispatch({ type: "BUY_UPGRADE", upgradeId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const startAcquisitionEvent = useCallback(
    (definitionId: AcquisitionEvent["definitionId"]) =>
      dispatch({ type: "START_ACQUISITION_EVENT", definitionId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const cancelAcquisitionEvent = useCallback(
    (eventId: string) =>
      dispatch({ type: "CANCEL_ACQUISITION_EVENT", eventId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const assignCollaborator = useCallback(
    (collaboratorId: string, assignment: CollaboratorAssignment) =>
      dispatch({ type: "ASSIGN_COLLABORATOR", collaboratorId, assignment, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const incrementCollaboratorAssignment = useCallback(
    (assignment: CollaboratorMasteryRole) =>
      dispatch({ type: "INCREMENT_COLLABORATOR_ASSIGNMENT", assignment }),
    [dispatch],
  );
  const decrementCollaboratorAssignment = useCallback(
    (assignment: CollaboratorMasteryRole) =>
      dispatch({ type: "DECREMENT_COLLABORATOR_ASSIGNMENT", assignment }),
    [dispatch],
  );
  const startTraining = useCallback(
    (personId: string, formId: FormId) =>
      dispatch({ type: "START_FORM_TRAINING", personId, formId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const bookTechnicianCourse = useCallback(
    (collaboratorId: string, formId: FormId) =>
      dispatch({ type: "BOOK_TECHNICIAN_COURSE", collaboratorId, formId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const toggleMemberFavorite = useCallback(
    (contactId: string) => dispatch({ type: "TOGGLE_MEMBER_FAVORITE", contactId }),
    [dispatch],
  );
  const cancelMemberEnrollment = useCallback(
    (contactId: string) => dispatch({ type: "CANCEL_MEMBER_ENROLLMENT", contactId }),
    [dispatch],
  );
  const startChronicles = useCallback(
    (contactIds: string[]) =>
      dispatch({ type: "START_CHRONICLES_TOURNAMENT", contactIds, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const playChroniclesHand = useCallback(
    (choice: RockPaperScissorsChoice) =>
      dispatch({ type: "PLAY_CHRONICLES_HAND", choice, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const addAdminContacts = useCallback(
    (amount: number) => dispatch({ type: "ADMIN_ADD_CONTACTS", amount }),
    [dispatch],
  );
  const addAdminMembers = useCallback(
    (amount: number) => dispatch({ type: "ADMIN_ADD_MEMBERS", amount }),
    [dispatch],
  );
  const addAdminEuros = useCallback(
    (amount: number) => dispatch({ type: "ADMIN_ADD_EUROS", amount }),
    [dispatch],
  );
  const addAdminSwords = useCallback(
    (amount: number) => dispatch({ type: "ADMIN_ADD_SWORDS", amount }),
    [dispatch],
  );
  const advanceAdminMonth = useCallback(
    () => dispatch({ type: "ADMIN_ADVANCE_MONTH", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const scheduleAdminLegendaryTrial = useCallback(
    () => dispatch({ type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const maintainEquipment = useCallback(
    () => dispatch({ type: "MAINTAIN_EQUIPMENT", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const startReptilePreparation = useCallback(
    (assignments: ReptileSectorAssignments) => dispatch({
      type: "START_REPTILE_PREPARATION",
      assignments,
      now: getGameNow(),
    }),
    [dispatch, getGameNow],
  );
  const startReptileMinigame = useCallback(
    () => dispatch({ type: "START_REPTILE_MINIGAME", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const completeReptileMinigame = useCallback(
    (hits: number, misses: number, outsideClicks: number) => dispatch({
      type: "COMPLETE_REPTILE_MINIGAME",
      hits,
      misses,
      outsideClicks,
      now: getGameNow(),
    }),
    [dispatch, getGameNow],
  );
  const skipReptileMinigame = useCallback(
    () => dispatch({ type: "SKIP_REPTILE_MINIGAME", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const cancelReptilePreparation = useCallback(
    () => dispatch({ type: "CANCEL_REPTILE_PREPARATION", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const bookReptileVenue = useCallback(
    () => dispatch({ type: "BOOK_REPTILE_VENUE", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const advanceReptilePresentation = useCallback(
    () => dispatch({ type: "ADVANCE_REPTILE_PRESENTATION", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const skipReptilePresentation = useCallback(
    () => dispatch({ type: "SKIP_REPTILE_PRESENTATION", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const setCollaboratorFallback = useCallback(
    (
      assignment: CollaboratorMasteryRole,
      fallback: CollaboratorMasteryRole | null,
    ) => dispatch({ type: "SET_COLLABORATOR_FALLBACK", assignment, fallback }),
    [dispatch],
  );
  const moveOperationalPriority = useCallback(
    (assignment: CollaboratorMasteryRole, direction: "up" | "down") =>
      dispatch({ type: "MOVE_OPERATIONAL_PRIORITY", assignment, direction }),
    [dispatch],
  );
  const startGadgetProject = useCallback(
    (productId: GadgetProductId) => dispatch({
      type: "START_GADGET_PROJECT",
      productId,
      now: getGameNow(),
    }),
    [dispatch, getGameNow],
  );
  const startGadgetRevision = useCallback(
    (productId: GadgetProductId) => dispatch({
      type: "START_GADGET_REVISION",
      productId,
      now: getGameNow(),
    }),
    [dispatch, getGameNow],
  );
  const startGadgetMinigame = useCallback(
    (productId: GadgetProductId) => dispatch({
      type: "START_GADGET_MINIGAME",
      productId,
    }),
    [dispatch],
  );
  const completeGadgetMinigame = useCallback(
    (productId: GadgetProductId, score: number) => dispatch({
      type: "COMPLETE_GADGET_MINIGAME",
      productId,
      score,
    }),
    [dispatch],
  );
  const dismissGadgetMinigameResult = useCallback(
    (productId: GadgetProductId) => {
      setView("gadget");
      dispatch({
        type: "DISMISS_GADGET_MINIGAME_RESULT",
        productId,
      });
    },
    [dispatch],
  );
  const acceptGadgetProduct = useCallback(
    (productId: GadgetProductId) => {
      setView("gadget");
      dispatch({
        type: "ACCEPT_GADGET_PRODUCT",
        productId,
      });
    },
    [dispatch],
  );

  if (!state.profile.displayName.trim()) {
    return <ProfileNameDialog onSubmit={updateProfileName} />;
  }

  return (
    <GameStateStoreProvider value={gameStateStore}>
    <GameTimeProvider
      getNow={getGameNow}
      getWallNow={getWallNow}
      isPaused={isPaused}
      speed={gameSpeed}
    >
      <div
        className={reduceMotion ? "application-shell reduce-motion" : "application-shell"}
        style={{ "--school-accent": state.school.accentColor } as CSSProperties}
      >
        <StableTitleBar
          currentMonth={state.school.currentMonth}
          nextMonthAt={state.school.nextFeeAt}
          contactsAwaitingEmail={selectContactsAwaitingEmail(state)}
          activeMembers={state.school.activeMembers}
          fame={state.school.fame}
          followers={state.unlocks.social ? state.school.followers : undefined}
          euros={state.school.euros}
          isPaused={isPaused}
          equipment={state.equipment}
          onTogglePause={togglePause}
        />
        <CommandBar
          onCompose={openComposer}
          onMarkAllRead={markAllMessagesRead}
          canMarkAllRead={
            view === "mail" &&
            mailFolder === "inbox" &&
            visibleInboxMessages.some((message) => message.unread)
          }
        />
        <div className={activeView === "mail" ? "workspace" : "workspace overview-workspace"}>
          <StableAppRail view={activeView} onChange={setView} />
          {activeView === "mail" ? (
            <>
              <StableFolderPane
                folder={mailFolder}
                onSelectFolder={selectFolder}
                onOpenComposer={openComposer}
                onOpenMembers={openMembers}
              />
              <StableMessageList
                folder={mailFolder}
                selectedMessageId={selectedMessageId}
                selectedSentEmailId={selectedSentEmailId}
                onSelectMessage={selectMessage}
                onSelectSentEmail={setSelectedSentEmailId}
              />
              {mailFolder === "sent" ? (
                selectedSentEmail ? (
                  <StableSentMailDetail email={selectedSentEmail} />
                ) : (
                  <main className="empty-composer">
                    <Icon name="send" />
                    <h1>Nessuna mail inviata</h1>
                    <p>Completa una campagna per visualizzarne qui il contenuto e lo stato.</p>
                  </main>
                )
              ) : selectedMessage ? (
                <MessageDetail message={selectedMessage} />
              ) : (
                <StableComposer
                  onWrite={write}
                  onAutomaticSendingChange={setAutomaticEmailSending}
                />
              )}
            </>
          ) : activeView === "upgrades" ? (
            <StableUpgradesView onBuyUpgrade={buyUpgrade} />
          ) : activeView === "events" ? (
            <StableEventsView
              onStart={startAcquisitionEvent}
              onCancel={cancelAcquisitionEvent}
            />
          ) : activeView === "contacts" ? (
            <StablePeopleView
              onAssign={assignCollaborator}
              onIncrementCollaboratorAssignment={incrementCollaboratorAssignment}
              onDecrementCollaboratorAssignment={decrementCollaboratorAssignment}
              onSetCollaboratorFallback={setCollaboratorFallback}
              onMoveOperationalPriority={moveOperationalPriority}
              onStartTraining={startTraining}
              onBookTechnicianCourse={bookTechnicianCourse}
              onToggleFavorite={toggleMemberFavorite}
              onCancelEnrollment={cancelMemberEnrollment}
            />
          ) : activeView === "tournaments" ? (
            <StableTournamentsView
              gameSpeed={gameSpeed}
              onOpenAthletes={openMembers}
              onStartChronicles={startChronicles}
              onPlayChroniclesHand={playChroniclesHand}
              onStartReptilePreparation={startReptilePreparation}
              onStartReptileMinigame={startReptileMinigame}
              onCompleteReptileMinigame={completeReptileMinigame}
              onSkipReptileMinigame={skipReptileMinigame}
              onCancelReptilePreparation={cancelReptilePreparation}
              onBookReptileVenue={bookReptileVenue}
              onAdvanceReptilePresentation={advanceReptilePresentation}
              onSkipReptilePresentation={skipReptilePresentation}
            />
          ) : activeView === "gadget" ? (
            <StableGadgetsView
              onStartProject={startGadgetProject}
              onStartRevision={startGadgetRevision}
              onStartMinigame={startGadgetMinigame}
              onCompleteMinigame={completeGadgetMinigame}
              onDismissMinigameResult={dismissGadgetMinigameResult}
              onAccept={acceptGadgetProduct}
            />
          ) : activeView === "ludowiki" ? (
            <StableLudoWikiView />
          ) : activeView === "admin" ? (
            <AdminEmailView
              totalContacts={state.contacts.length}
              availableContacts={selectAvailableContacts(state)}
              activeMembers={state.school.activeMembers}
              euros={state.school.euros}
              totalSwords={state.equipment.totalSwords}
              availableSwords={getAvailableSwords(state.equipment)}
              damagedSwords={state.equipment.damagedSwords}
              currentMonth={state.school.currentMonth}
              availableLegendaryProfiles={
                getAvailableStandardLegendaryProfiles(state, getGameNow()).length
              }
              gameSpeed={gameSpeed}
              onGameSpeedChange={setGameSpeed}
              onAddContacts={addAdminContacts}
              onAddMembers={addAdminMembers}
              onAddEuros={addAdminEuros}
              onAddSwords={addAdminSwords}
              onAdvanceMonth={advanceAdminMonth}
              onScheduleLegendaryTrial={scheduleAdminLegendaryTrial}
            />
          ) : (
            <StableOverviewView
              view={activeView}
              onExport={exportSave}
              onImport={importSave}
              onReset={resetSave}
              onForceUpdate={forceGameUpdate}
              saveStatus={saveStatus}
              onSaveNow={saveNow}
              onUpdateProfileName={updateProfileName}
              darkMode={darkMode}
              onDarkModeChange={setDarkMode}
              reduceMotion={reduceMotion}
              onReduceMotionChange={setReduceMotion}
            />
          )}
          <StableDayPanel
            onMaintainEquipment={maintainEquipment}
            onBuyOfficialSwords={buyOfficialSwords}
          />
        </div>
        <footer className="status-bar">
          <span>Tutti i messaggi sono aggiornati.</span>
          <span>Profilo: {state.profile.displayName}</span>
          <span>Connesso localmente</span>
          <b title={state.school.motto || undefined}>
            {state.school.name} · v{APP_VERSION}
          </b>
        </footer>
      </div>
      {tutorial.activeScene && tutorial.activeStep ? (
        <TutorialLayer
          scene={tutorial.activeScene}
          step={tutorial.activeStep}
          stepIndex={tutorial.activeStepIndex}
          context={tutorial.context}
          onContinue={tutorial.continueScene}
          onSkip={tutorial.skipScene}
        />
      ) : null}
    </GameTimeProvider>
    </GameStateStoreProvider>
  );
}

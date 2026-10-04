import {
  lazy,
  memo,
  Suspense,
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
import { NetworkView } from "../features/network/NetworkView";
import { EventsView } from "../features/events/EventsView";
import { PeopleView } from "../features/people/PeopleView";
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
import { getGadgetFamilyUnitsSold } from "../game/gadgetRarity";
import { isGameAreaUnlocked } from "../game/progression";
import { exportGame, importGame, resetGame, saveGame } from "../game/save";
import type { ReputationSpending } from "../game/reputation";
import {
  selectAvailableContacts,
  selectContactsAwaitingEmail,
} from "../game/selectors";
import type {
  AcquisitionEvent,
  CollaboratorAssignment,
  CollaboratorMasteryRole,
  FormId,
  FormTrainingStartMode,
  GadgetProductId,
  RockPaperScissorsChoice,
  ReptileSector,
  SchoolFoundationDetails,
  TournamentResult,
  UpgradeId,
} from "../game/types";
import { APP_VERSION } from "../shared/appVersion";
import { GameFeedbackLayer } from "../features/feedback/GameFeedbackLayer";
import { AchievementToast } from "../features/feedback/AchievementToast";
import type { LudoWikiSection } from "../features/ludowiki/LudoWikiView";
import { MomentLayer } from "../features/moments/MomentLayer";
import { FinalDuelLayer } from "../features/tournaments/FinalDuelLayer";
import { ReptileDayLayer } from "../features/tournaments/ReptileDayLayer";
import { ReptileIncidentsLayer } from "../features/tournaments/ReptileIncidentsLayer";
import { clearIncidentsAttempt, readIncidentsAttempt } from "../features/tournaments/reptileUi";
import { getReptileSectorForRole } from "../game/reptileSectors";
import { useAppPreferences } from "./useAppPreferences";

const StableTitleBar = memo(TitleBar);
const StableAppRail = memo(AppRail);
const StableFolderPane = memo(FolderPane);
const StableMessageList = memo(MessageList);
const StableSentMailDetail = memo(SentMailDetail);
const StableComposer = memo(Composer);
// ponytail: lazy-load only the late-game views; core mail/upgrade views stay in the main chunk.
const AdminEmailView = lazy(() => import("../features/admin/AdminEmailView").then((module) => ({ default: module.AdminEmailView })));
const TournamentsView = lazy(() => import("../features/tournaments/TournamentsView").then((module) => ({ default: module.TournamentsView })));
const GadgetsView = lazy(() => import("../features/gadgets/GadgetsView").then((module) => ({ default: module.GadgetsView })));
const LudoWikiView = lazy(() => import("../features/ludowiki/LudoWikiView").then((module) => ({ default: module.LudoWikiView })));
const BOSS_KEY = "F9";
const StableUpgradesView = memo(UpgradesView);
const StableEventsView = memo(EventsView);
const StablePeopleView = memo(PeopleView);
const StableTournamentsView = memo(TournamentsView);
const StableGadgetsView = memo(GadgetsView);
const StableLudoWikiView = memo(LudoWikiView);
const StableOverviewView = memo(OverviewView);
const StableNetworkView = memo(NetworkView);
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
    setMomentPaused,
    setFoundationPaused,
    setPracticePaused,
    saveStatus,
    saveNow,
  } = useGameEngine();
  const gameStateStore = useGameStateStore(state);
  const [view, setView] = useState<AppView>("mail");
  const [mailFolder, setMailFolder] = useState<MailFolder>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null);
  const { reduceMotion, setReduceMotion, darkMode, setDarkMode } = useAppPreferences();

  useEffect(() => {
    // Boss key: F9 swaps between Modalità Onde (dark) and the Outlook camouflage (light).
    const handleBossKey = (event: KeyboardEvent) => {
      if (event.key !== BOSS_KEY || event.repeat) return;
      event.preventDefault();
      setDarkMode((enabled) => !enabled);
    };
    window.addEventListener("keydown", handleBossKey);
    return () => window.removeEventListener("keydown", handleBossKey);
  }, [setDarkMode]);
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
  const reptile = state.tournaments.reptile;
  const reptileEdition = reptile.activeEdition;
  const reptileMinigameRunning = reptileEdition?.minigame.status === "running";
  // An attempt is live only if it started in this page: after a reload it closes with its points.
  const [reptileAttemptLive, setReptileAttemptLive] = useState(false);
  const [reptileTutorialOpen, setReptileTutorialOpen] = useState(false);
  const [reptileDayReplay, setReptileDayReplay] = useState(false);
  const reptileDayResult = reptile.latestRecap && (reptile.unseenRecap || reptileDayReplay)
    ? reptile.latestRecap
    : undefined;
  const hasBlockingReptileFlow = (reptileMinigameRunning && reptileAttemptLive) ||
    (reptileTutorialOpen && Boolean(reptileEdition)) ||
    reptileDayResult !== undefined;
  const activeView: AppView = hasActiveGadgetMinigame
    ? "gadget"
    : view === "ludowiki"
      ? import.meta.env.DEV || state.achievements.length > 0 ? view : "mail"
    : view === "admin"
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

  const activeMoment = reptileDayResult ? undefined : state.moments.queue[0];
  useLayoutEffect(() => {
    setMomentPaused(activeMoment !== undefined);
  }, [activeMoment, setMomentPaused]);
  const dismissMoment = useCallback(() => dispatch({ type: "DISMISS_MOMENT" }), [dispatch]);
  // A snapshot: the result may leave the detailed history while the final plays.
  const [watchedFinal, setWatchedFinal] = useState<TournamentResult>();
  const closeFinal = useCallback(() => setWatchedFinal(undefined), []);
  // A new key remounts Tornei on the result even when it is already open.
  const [tournamentFocus, setTournamentFocus] = useState<{ resultId?: string; key: number }>();
  const showFinalResults = useCallback(() => {
    if (!watchedFinal) return;
    const resultId = watchedFinal.id;
    setTournamentFocus((previous) => ({ resultId, key: (previous?.key ?? 0) + 1 }));
    setWatchedFinal(undefined);
    setView("tournaments");
  }, [watchedFinal]);
  // From the rail Tornei opens as usual: the focus served its one visit.
  // The achievement toast opens LudoWiki › Traguardi; the key remounts the view if it is already open.
  const [wikiEntry, setWikiEntry] = useState<{ section: LudoWikiSection; key: number }>({ section: "ludodex", key: 0 });
  const changeView = useCallback((next: AppView) => {
    setTournamentFocus((focus) => focus && { key: focus.key });
    setWikiEntry((entry) => ({ ...entry, section: "ludodex" }));
    setView(next);
  }, []);
  const openAchievements = useCallback(() => {
    setTournamentFocus((focus) => focus && { key: focus.key });
    setWikiEntry((entry) => ({ section: "achievements", key: entry.key + 1 }));
    setView("ludowiki");
  }, []);
  const tournamentResults = state.tournaments.results;
  const watchFinal = useCallback(
    (resultId: string) => setWatchedFinal(tournamentResults.find((result) => result.id === resultId)),
    [tournamentResults],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        activeView !== "mail" ||
        mailFolder !== "inbox" ||
        selectedMessageId !== null ||
        !state.profile.displayName.trim() ||
        tutorial.isBlockingInput ||
        activeMoment !== undefined ||
        watchedFinal !== undefined ||
        event.repeat ||
        event.key === BOSS_KEY ||
        isWindowsKey(event) ||
        targetConsumesKeyboard(event.target)
      )
        return;
      dispatch({ type: "WRITE", now: getGameNow() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeMoment,
    watchedFinal,
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
  const foundSchool = useCallback((details: SchoolFoundationDetails, spending: ReputationSpending) => {
    dispatch({ type: "FOUND_SCHOOL", details, spending, now: getGameNow() });
    openComposer();
  }, [dispatch, getGameNow, openComposer]);
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
  const setAutomaticTeaching = useCallback(
    (enabled: boolean) => dispatch({ type: "SET_AUTOMATIC_TEACHING", enabled }),
    [dispatch],
  );
  const buyUpgrade = useCallback(
    (upgradeId: UpgradeId) => dispatch({ type: "BUY_UPGRADE", upgradeId, now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const buyAllUpgrades = useCallback(
    () => dispatch({ type: "BUY_ALL_UPGRADES", now: getGameNow() }),
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
  const toggleAutomaticAssignment = useCallback(
    (enabled: boolean) => dispatch({ type: "SET_AUTOMATIC_ASSIGNMENT", enabled }),
    [dispatch],
  );
  const changeAutomaticShare = useCallback(
    (assignment: CollaboratorMasteryRole, level: number) =>
      dispatch({ type: "CHANGE_AUTOMATIC_SHARE", assignment, level }),
    [dispatch],
  );
  const startTraining = useCallback(
    (personId: string, formId: FormId, mode?: FormTrainingStartMode) =>
      dispatch({
        type: "START_FORM_TRAINING",
        personId,
        formId,
        now: getGameNow(),
        ...(mode ? { mode } : {}),
      }),
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
  const resetAdminGadgetSales = useCallback(
    () => dispatch({ type: "ADMIN_RESET_GADGET_SALES" }),
    [dispatch],
  );
  const organizeReptile = useCallback(
    () => dispatch({ type: "ORGANIZE_REPTILE", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const cancelReptile = useCallback(
    () => dispatch({ type: "CANCEL_REPTILE", now: getGameNow() }),
    [dispatch, getGameNow],
  );
  const playReptileMinigame = useCallback(() => {
    setReptileTutorialOpen(false);
    setReptileAttemptLive(true);
    dispatch({ type: "START_REPTILE_MINIGAME", now: getGameNow() });
  }, [dispatch, getGameNow]);
  const completeReptileMinigame = useCallback((score: number, available: number) => {
    if (reptileEdition) clearIncidentsAttempt(reptileEdition.id);
    setReptileAttemptLive(false);
    dispatch({ type: "COMPLETE_REPTILE_MINIGAME", score, available, now: getGameNow() });
  }, [dispatch, getGameNow, reptileEdition]);
  const openReptileTutorial = useCallback(() => setReptileTutorialOpen(true), []);
  const closeReptileTutorial = useCallback(() => setReptileTutorialOpen(false), []);
  const replayReptileDay = useCallback(() => setReptileDayReplay(true), []);
  const closeReptileDay = useCallback(() => {
    setReptileDayReplay(false);
    if (reptile.unseenRecap) dispatch({ type: "DISMISS_REPTILE_RECAP" });
  }, [dispatch, reptile.unseenRecap]);
  useEffect(() => {
    if (!reptileMinigameRunning || reptileAttemptLive || !reptileEdition) return;
    const attempt = readIncidentsAttempt(reptileEdition.id);
    clearIncidentsAttempt(reptileEdition.id);
    dispatch({ type: "COMPLETE_REPTILE_MINIGAME", ...attempt, now: getGameNow() });
  }, [dispatch, getGameNow, reptileAttemptLive, reptileEdition, reptileMinigameRunning]);
  const reptileNames = useMemo(() => {
    const names: Partial<Record<ReptileSector, string[]>> = {};
    for (const collaborator of state.collaborators) {
      const sector = getReptileSectorForRole(collaborator.assignment);
      if (!sector) continue;
      (names[sector] ??= []).push(collaborator.displayName.split(" ")[0]);
    }
    return names;
  }, [state.collaborators]);
  const moveOperationalPriority = useCallback(
    (assignment: CollaboratorMasteryRole, toIndex: number) =>
      dispatch({ type: "MOVE_OPERATIONAL_PRIORITY", assignment, toIndex }),
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
        <GameFeedbackLayer />
        <AchievementToast onOpen={openAchievements} />
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
          onMaintainEquipment={maintainEquipment}
          onBuyOfficialSwords={buyOfficialSwords}
        />
        <div className={activeView === "mail" ? "workspace" : "workspace overview-workspace"}>
          <StableAppRail view={activeView} onChange={changeView} />
          <Suspense fallback={null}>
          {activeView === "mail" ? (
            <>
              <CommandBar
                onCompose={openComposer}
                onMarkAllRead={markAllMessagesRead}
                canMarkAllRead={
                  mailFolder === "inbox" &&
                  visibleInboxMessages.some((message) => message.unread)
                }
              />
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
                    <h1>Nessuna email inviata</h1>
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
            <StableUpgradesView onBuyUpgrade={buyUpgrade} onBuyAllUpgrades={buyAllUpgrades} />
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
              onToggleAutomaticAssignment={toggleAutomaticAssignment}
              onChangeAutomaticShare={changeAutomaticShare}
              onMoveOperationalPriority={moveOperationalPriority}
              onStartTraining={startTraining}
              onBookTechnicianCourse={bookTechnicianCourse}
              onToggleAutomaticTeaching={setAutomaticTeaching}
              onToggleFavorite={toggleMemberFavorite}
              onCancelEnrollment={cancelMemberEnrollment}
            />
          ) : activeView === "tournaments" ? (
            <StableTournamentsView
              key={tournamentFocus?.key}
              focusResultId={tournamentFocus?.resultId}
              gameSpeed={gameSpeed}
              onOpenAthletes={openMembers}
              onStartChronicles={startChronicles}
              onPlayChroniclesHand={playChroniclesHand}
              onOrganizeReptile={organizeReptile}
              onCancelReptile={cancelReptile}
              onPlayReptileMinigame={playReptileMinigame}
              onOpenReptileTutorial={openReptileTutorial}
              onReplayReptileDay={replayReptileDay}
            />
          ) : activeView === "gadget" ? (
            <StableGadgetsView
              onStartProject={startGadgetProject}
              onStartRevision={startGadgetRevision}
              onStartMinigame={startGadgetMinigame}
              onCompleteMinigame={completeGadgetMinigame}
              onDismissMinigameResult={dismissGadgetMinigameResult}
              onAccept={acceptGadgetProduct}
              onPracticeRunningChange={setPracticePaused}
            />
          ) : activeView === "ludowiki" ? (
            <StableLudoWikiView key={wikiEntry.key} initialSection={wikiEntry.section} />
          ) : activeView === "network" ? (
            <StableNetworkView onFoundSchool={foundSchool} onFoundationOpenChange={setFoundationPaused} />
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
              gadgetUnitsSold={Object.values(state.gadgets.products).reduce(
                (total, product) => total + getGadgetFamilyUnitsSold(product),
                0,
              )}
              gameSpeed={gameSpeed}
              onGameSpeedChange={setGameSpeed}
              onAddContacts={addAdminContacts}
              onAddMembers={addAdminMembers}
              onAddEuros={addAdminEuros}
              onAddSwords={addAdminSwords}
              onAdvanceMonth={advanceAdminMonth}
              onScheduleLegendaryTrial={scheduleAdminLegendaryTrial}
              onResetGadgetSales={resetAdminGadgetSales}
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
          </Suspense>
          <StableDayPanel
            onWatchFinal={watchFinal}
          />
        </div>
        <footer className="status-bar">
          <span>Tutti i messaggi sono aggiornati.</span>
          <span>Profilo: {state.profile.displayName}</span>
          <span>Connesso localmente</span>
          <b>
            {state.school.name} · v{APP_VERSION}
          </b>
        </footer>
      </div>
      {watchedFinal ? <FinalDuelLayer result={watchedFinal} onClose={closeFinal} onShowResults={showFinalResults} /> : null}
      {reptileEdition && ((reptileMinigameRunning && reptileAttemptLive) || reptileTutorialOpen) ? (
        <ReptileIncidentsLayer
          key={reptileMinigameRunning ? "play" : "tutorial"}
          mode={reptileMinigameRunning ? "play" : "tutorial"}
          superba={state.network.superbaTournament === true}
          editionId={reptileEdition.id}
          sectors={Object.keys(reptileEdition.bars) as ReptileSector[]}
          names={reptileNames}
          onFinish={completeReptileMinigame}
          onClose={closeReptileTutorial}
          onPlay={playReptileMinigame}
        />
      ) : null}
      {reptileDayResult ? (
        <ReptileDayLayer
          result={reptileDayResult}
          superba={reptileDayResult.superba === true}
          city={state.school.city}
          onClose={closeReptileDay}
        />
      ) : null}
      {activeMoment !== undefined ? (
        <MomentLayer key={activeMoment} state={state} momentKey={activeMoment} onDismiss={dismissMoment} />
      ) : tutorial.activeScene && tutorial.activeStep ? (
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

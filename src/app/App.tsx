import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { Icon } from "../components/common/Icon";
import { ProfileNameDialog } from "../components/ProfileNameDialog";
import {
  AppRail,
  type AppView,
} from "../components/outlook-shell/AppRail";
import { CommandBar } from "../components/outlook-shell/CommandBar";
import { Composer } from "../components/outlook-shell/Composer";
import { FolderPane, type MailFolder } from "../components/outlook-shell/FolderPane";
import { MessageDetail } from "../components/outlook-shell/MessageDetail";
import { MessageList } from "../components/outlook-shell/MessageList";
import { SentMailDetail } from "../components/outlook-shell/SentMailDetail";
import { TitleBar } from "../components/outlook-shell/TitleBar";
import { OverviewView } from "../features/OverviewView";
import { ActivitiesView } from "../features/activities/ActivitiesView";
import { AdminEmailView } from "../features/admin/AdminEmailView";
import { EventsView } from "../features/events/EventsView";
import { PeopleView } from "../features/people/PeopleView";
import { TournamentsView } from "../features/tournaments/TournamentsView";
import { UpgradesView } from "../features/upgrades/UpgradesView";
import { DayPanel } from "../features/day-panel/DayPanel";
import { TutorialLayer } from "../features/tutorial/TutorialLayer";
import { useTutorialController } from "../features/tutorial/useTutorialController";
import { GameTimeProvider } from "../game/GameTimeProvider";
import { getAvailableSwords } from "../game/equipment";
import { useGameEngine } from "../game/useGameEngine";
import { getAvailableStandardLegendaryProfiles } from "../game/legendaryAvailability";
import { isGameAreaUnlocked } from "../game/progression";
import { exportGame, importGame, resetGame, saveGame } from "../game/save";
import {
  selectAvailableContacts,
  selectContactsAwaitingEmail,
  selectVisibleInboxMessages,
} from "../game/selectors";
import { APP_VERSION } from "../shared/appVersion";
import { useAppPreferences } from "./useAppPreferences";

function targetConsumesKeyboard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}

function isWindowsKey(event: KeyboardEvent): boolean {
  return event.key === "Meta" || event.key === "OS" || event.key === "Win" ||
    event.key === "Shift" ||
    event.code === "MetaLeft" || event.code === "MetaRight" ||
    event.code === "ShiftLeft" || event.code === "ShiftRight";
}

export function App() {
  const {
    state,
    dispatch,
    getGameNow,
    isPaused,
    togglePause,
    setTutorialPaused,
    saveStatus,
    saveNow,
  } = useGameEngine();
  const [view, setView] = useState<AppView>("mail");
  const [mailFolder, setMailFolder] = useState<MailFolder>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null);
  const {
    reduceMotion,
    setReduceMotion,
    darkMode,
    setDarkMode,
  } = useAppPreferences();
  const visibleInboxMessages = selectVisibleInboxMessages(state);
  const selectedMessage = visibleInboxMessages.find(
    (message) => message.id === selectedMessageId,
  );
  const selectedSentEmail = state.emails.find((email) => email.id === selectedSentEmailId);
  const activeView: AppView = view === "admin"
    ? import.meta.env.DEV ? "admin" : "mail"
    : isGameAreaUnlocked(view, state) ? view : "mail";
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
      ) return;
      dispatch({ type: "WRITE", now: getGameNow() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, dispatch, getGameNow, mailFolder, selectedMessageId, state.profile.displayName, tutorial.isBlockingInput]);

  const write = () => dispatch({ type: "WRITE", now: getGameNow() });
  const selectMessage = (messageId: string | null) => {
    if (messageId) dispatch({ type: "MARK_MESSAGE_READ", messageId });
    setSelectedMessageId(messageId);
  };
  const selectFolder = (folder: MailFolder) => {
    setMailFolder(folder);
    setSelectedMessageId(null);
    if (folder === "sent") {
      const latestSent = state.emails
        .filter((email) =>
          email.status !== "writing" &&
          email.status !== "readyToSend" &&
          email.status !== "sending",
        )
        .at(-1);
      setSelectedSentEmailId(latestSent?.id ?? null);
    }
  };
  const openComposer = () => {
    setView("mail");
    setMailFolder("inbox");
    setSelectedMessageId(null);
  };
  const exportSave = () => {
    const blob = new Blob([exportGame(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oggetto-nuovi-iscritti-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importSave = (raw: string) => {
    const imported = importGame(raw);
    if (!imported) return false;
    dispatch({ type: "REPLACE_STATE", state: imported });
    saveGame(imported);
    return true;
  };
  const resetSave = () => {
    dispatch({ type: "REPLACE_STATE", state: resetGame() });
    setView("mail");
  };
  const updateProfileName = (displayName: string) => {
    dispatch({ type: "UPDATE_PROFILE_NAME", displayName });
  };
  const forceGameUpdate = () => {
    if (!saveNow()) return;
    const updateUrl = new URL(window.location.href);
    updateUrl.searchParams.set("refresh", Date.now().toString());
    window.location.replace(updateUrl);
  };

  if (!state.profile.displayName.trim()) {
    return <ProfileNameDialog onSubmit={updateProfileName} />;
  }

  return (
    <GameTimeProvider getNow={getGameNow} isPaused={isPaused}>
      <div
        className={reduceMotion ? "application-shell reduce-motion" : "application-shell"}
        style={{ "--school-accent": state.school.accentColor } as CSSProperties}
      >
      <TitleBar
        currentMonth={state.school.currentMonth}
        nextMonthAt={state.school.nextFeeAt}
        contactsAwaitingEmail={selectContactsAwaitingEmail(state)}
        activeMembers={state.school.activeMembers}
        historicMembers={state.school.historicMembers}
        followers={state.unlocks.social ? state.school.followers : undefined}
        euros={state.school.euros}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
      <CommandBar
        onCompose={openComposer}
        onMarkAllRead={() => dispatch({ type: "MARK_ALL_MESSAGES_READ" })}
        canMarkAllRead={
          view === "mail" &&
          mailFolder === "inbox" &&
          visibleInboxMessages.some((message) => message.unread)
        }
      />
      <div className={activeView === "mail" ? "workspace" : "workspace overview-workspace"}>
        <AppRail view={activeView} state={state} onChange={setView} />
        {activeView === "mail" ? (
          <>
            <FolderPane
              state={state}
              folder={mailFolder}
              onSelectFolder={selectFolder}
              onOpenComposer={openComposer}
              onOpenMembers={() => setView("contacts")}
            />
            <MessageList
              state={state}
              folder={mailFolder}
              selectedMessageId={selectedMessageId}
              selectedSentEmailId={selectedSentEmailId}
              onSelectMessage={selectMessage}
              onSelectSentEmail={setSelectedSentEmailId}
            />
            {mailFolder === "sent" ? (
              selectedSentEmail ? <SentMailDetail state={state} email={selectedSentEmail} /> : <main className="empty-composer"><Icon name="send" /><h1>Nessuna mail inviata</h1><p>Completa una campagna per visualizzarne qui il contenuto e lo stato.</p></main>
            ) : selectedMessage ? <MessageDetail message={selectedMessage} /> : <Composer
              state={state}
              onWrite={write}
              onAutomaticSendingChange={(enabled) => dispatch({
                type: "SET_AUTOMATIC_EMAIL_SENDING",
                enabled,
                now: getGameNow(),
              })}
            />}
          </>
        ) : activeView === "upgrades" ? (
          <UpgradesView
            state={state}
            onBuyUpgrade={(upgradeId) =>
              dispatch({ type: "BUY_UPGRADE", upgradeId, now: getGameNow() })
            }
          />
        ) : activeView === "events" ? (
          <EventsView
            state={state}
            onStart={(definitionId) =>
              dispatch({ type: "START_ACQUISITION_EVENT", definitionId, now: getGameNow() })
            }
            onCancel={(eventId) =>
              dispatch({ type: "CANCEL_ACQUISITION_EVENT", eventId, now: getGameNow() })
            }
            onMaintainEquipment={() =>
              dispatch({ type: "MAINTAIN_EQUIPMENT", now: getGameNow() })
            }
            onBuyOfficialSword={() =>
              dispatch({ type: "BUY_OFFICIAL_SWORD", now: getGameNow() })
            }
          />
        ) : activeView === "statistics" ? (
          <ActivitiesView state={state} />
        ) : activeView === "contacts" ? (
          <PeopleView
            state={state}
            onAssign={(collaboratorId, assignment) =>
              dispatch({
                type: "ASSIGN_COLLABORATOR",
                collaboratorId,
                assignment,
                now: getGameNow(),
              })
            }
            onIncrementCollaboratorAssignment={(assignment) =>
              dispatch({ type: "INCREMENT_COLLABORATOR_ASSIGNMENT", assignment })
            }
            onDecrementCollaboratorAssignment={(assignment) =>
              dispatch({ type: "DECREMENT_COLLABORATOR_ASSIGNMENT", assignment })
            }
            onStartTraining={(personId, formId) =>
              dispatch({
                type: "START_FORM_TRAINING",
                personId,
                formId,
                now: getGameNow(),
              })
            }
            onBookTechnicianCourse={(collaboratorId, formId) =>
              dispatch({
                type: "BOOK_TECHNICIAN_COURSE",
                collaboratorId,
                formId,
                now: getGameNow(),
              })
            }
            onToggleFavorite={(contactId) =>
              dispatch({ type: "TOGGLE_MEMBER_FAVORITE", contactId })
            }
            onCancelEnrollment={(contactId) =>
              dispatch({ type: "CANCEL_MEMBER_ENROLLMENT", contactId })
            }
          />
        ) : activeView === "tournaments" ? (
          <TournamentsView
            state={state}
            onOpenAthletes={() => setView("contacts")}
            onStartChronicles={(contactIds) => dispatch({
              type: "START_CHRONICLES_TOURNAMENT",
              contactIds,
              now: getGameNow(),
            })}
            onPlayChroniclesHand={(choice) => dispatch({
              type: "PLAY_CHRONICLES_HAND",
              choice,
              now: getGameNow(),
            })}
          />
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
            onAddContacts={(amount) => dispatch({ type: "ADMIN_ADD_CONTACTS", amount })}
            onAddMembers={(amount) => dispatch({ type: "ADMIN_ADD_MEMBERS", amount })}
            onAddEuros={(amount) => dispatch({ type: "ADMIN_ADD_EUROS", amount })}
            onAddSwords={(amount) => dispatch({ type: "ADMIN_ADD_SWORDS", amount })}
            onAdvanceMonth={() => dispatch({
              type: "ADMIN_ADVANCE_MONTH",
              now: getGameNow(),
            })}
            onScheduleLegendaryTrial={() => dispatch({
              type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL",
              now: getGameNow(),
            })}
          />
        ) : (
          <OverviewView
            view={activeView}
            state={state}
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
        <DayPanel state={state} />
      </div>
        <footer className="status-bar"><span>Tutti i messaggi sono aggiornati.</span><span>Profilo: {state.profile.displayName}</span><span>Connesso localmente</span><b title={state.school.motto || undefined}>{state.school.name} · v{APP_VERSION}</b></footer>
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
  );
}

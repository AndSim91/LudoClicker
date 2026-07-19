import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "../components/common/Icon";
import { ProfileNameDialog } from "../components/ProfileNameDialog";
import {
  AppRail,
  type AppView,
} from "../components/outlook-shell/AppRail";
import { CommandBar } from "../components/outlook-shell/CommandBar";
import { Composer } from "../components/outlook-shell/Composer";
import { DayPanel } from "../components/outlook-shell/DayPanel";
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
import { GameTimeProvider } from "../game/GameTimeContext";
import { useGameEngine } from "../game/useGameEngine";
import { isGameAreaUnlocked } from "../game/progression";
import { exportGame, importGame, resetGame, saveGame } from "../game/save";
import { selectAvailableContacts, selectContactsAwaitingEmail } from "../game/selectors";
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
  const selectedMessage = state.messages.find((message) => message.id === selectedMessageId);
  const selectedSentEmail = state.emails.find((email) => email.id === selectedSentEmailId);
  const activeView: AppView = view === "admin"
    ? import.meta.env.DEV ? "admin" : "mail"
    : isGameAreaUnlocked(view, state) ? view : "mail";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        activeView !== "mail" ||
        mailFolder !== "inbox" ||
        selectedMessageId !== null ||
        !state.profile.displayName.trim() ||
        event.repeat ||
        isWindowsKey(event) ||
        targetConsumesKeyboard(event.target)
      ) return;
      dispatch({ type: "WRITE", now: getGameNow() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, dispatch, getGameNow, mailFolder, selectedMessageId, state.profile.displayName]);

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
        .filter((email) => email.status !== "writing" && email.status !== "sending")
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

  if (!state.profile.displayName.trim()) {
    return <ProfileNameDialog onSubmit={updateProfileName} />;
  }

  return (
    <GameTimeProvider now={state.automation.lastProcessedAt}>
      <div
        className={reduceMotion ? "application-shell reduce-motion" : "application-shell"}
        style={{ "--school-accent": state.school.accentColor } as CSSProperties}
      >
      <TitleBar
        currentMonth={state.school.currentMonth}
        nextMonthAt={state.school.nextFeeAt}
        now={state.automation.lastProcessedAt}
        contactsAwaitingEmail={selectContactsAwaitingEmail(state)}
        activeMembers={state.school.activeMembers}
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
          state.messages.some((message) => message.unread)
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
            ) : selectedMessage ? <MessageDetail message={selectedMessage} /> : <Composer state={state} onWrite={write} />}
            <DayPanel state={state} />
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
            onMaintainEquipment={() =>
              dispatch({ type: "MAINTAIN_EQUIPMENT", now: getGameNow() })
            }
            onBuyOfficialSword={() =>
              dispatch({ type: "BUY_OFFICIAL_SWORD", now: getGameNow() })
            }
          />
        ) : activeView === "statistics" ? (
          <ActivitiesView
            state={state}
            onRunSocialCampaign={() =>
              dispatch({ type: "RUN_SOCIAL_CAMPAIGN", now: getGameNow() })
            }
          />
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
            onStartTraining={(personId, formId) =>
              dispatch({
                type: "START_FORM_TRAINING",
                personId,
                formId,
                now: getGameNow(),
              })
            }
            onToggleInstructorAutomation={(collaboratorId, enabled) =>
              dispatch({
                type: "TOGGLE_INSTRUCTOR_AUTOMATION",
                collaboratorId,
                enabled,
                now: getGameNow(),
              })
            }
          />
        ) : activeView === "tournaments" ? (
          <TournamentsView state={state} />
        ) : activeView === "admin" ? (
          <AdminEmailView
            totalContacts={state.contacts.length}
            availableContacts={selectAvailableContacts(state)}
            activeMembers={state.school.activeMembers}
            euros={state.school.euros}
            onAddContacts={(amount) => dispatch({ type: "ADMIN_ADD_CONTACTS", amount })}
            onAddMembers={(amount) => dispatch({ type: "ADMIN_ADD_MEMBERS", amount })}
            onAddEuros={(amount) => dispatch({ type: "ADMIN_ADD_EUROS", amount })}
          />
        ) : (
          <OverviewView
            view={activeView}
            state={state}
            onExport={exportSave}
            onImport={importSave}
            onReset={resetSave}
            onUpdateProfileName={updateProfileName}
            onFoundSchool={(details) => dispatch({
              type: "FOUND_SCHOOL",
              details,
              now: getGameNow(),
            })}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            reduceMotion={reduceMotion}
            onReduceMotionChange={setReduceMotion}
          />
        )}
      </div>
        <footer className="status-bar"><span>Tutti i messaggi sono aggiornati.</span><span>Profilo: {state.profile.displayName}</span><span>Connesso localmente</span><b title={state.school.motto || undefined}>{state.school.name}</b></footer>
      </div>
    </GameTimeProvider>
  );
}

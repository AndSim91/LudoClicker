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
import { UpgradesView } from "../features/upgrades/UpgradesView";
import { useGameEngine } from "../game/useGameEngine";
import { isGameAreaUnlocked } from "../game/progression";
import { exportGame, importGame, resetGame, saveGame } from "../game/save";

function targetConsumesKeyboard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}

export function App() {
  const { state, dispatch } = useGameEngine();
  const [view, setView] = useState<AppView>("mail");
  const [mailFolder, setMailFolder] = useState<MailFolder>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedSentEmailId, setSelectedSentEmailId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("oggetto-nuovi-iscritti.reduce-motion") === "true",
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("oggetto-nuovi-iscritti.theme") === "dark",
  );
  const selectedMessage = state.messages.find((message) => message.id === selectedMessageId);
  const selectedSentEmail = state.emails.find((email) => email.id === selectedSentEmailId);
  const activeView: AppView = view === "admin"
    ? import.meta.env.DEV ? "admin" : "mail"
    : isGameAreaUnlocked(view, state) ? view : "mail";

  useEffect(() => {
    localStorage.setItem("oggetto-nuovi-iscritti.reduce-motion", String(reduceMotion));
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem("oggetto-nuovi-iscritti.theme", darkMode ? "dark" : "light");
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        activeView !== "mail" ||
        mailFolder !== "inbox" ||
        selectedMessageId !== null ||
        !state.profile.displayName.trim() ||
        event.repeat ||
        targetConsumesKeyboard(event.target)
      ) return;
      dispatch({ type: "WRITE", now: Date.now() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, dispatch, mailFolder, selectedMessageId, state.profile.displayName]);

  const write = () => dispatch({ type: "WRITE", now: Date.now() });
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
    <div
      className={reduceMotion ? "application-shell reduce-motion" : "application-shell"}
      style={{ "--school-accent": state.school.accentColor } as CSSProperties}
    >
      <TitleBar
        currentMonth={state.school.currentMonth}
        nextMonthAt={state.school.nextFeeAt}
        now={state.automation.lastProcessedAt}
      />
      <CommandBar
        onCompose={() => { setView("mail"); setMailFolder("inbox"); setSelectedMessageId(null); }}
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
            <FolderPane state={state} folder={mailFolder} onSelectFolder={selectFolder} />
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
              dispatch({ type: "BUY_UPGRADE", upgradeId, now: Date.now() })
            }
          />
        ) : activeView === "events" ? (
          <EventsView
            state={state}
            onStart={(definitionId) =>
              dispatch({ type: "START_ACQUISITION_EVENT", definitionId, now: Date.now() })
            }
            onMaintainEquipment={() =>
              dispatch({ type: "MAINTAIN_EQUIPMENT", now: Date.now() })
            }
            onBuyOfficialSword={() =>
              dispatch({ type: "BUY_OFFICIAL_SWORD", now: Date.now() })
            }
          />
        ) : activeView === "statistics" ? (
          <ActivitiesView
            state={state}
            onRunSocialCampaign={() =>
              dispatch({ type: "RUN_SOCIAL_CAMPAIGN", now: Date.now() })
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
                now: Date.now(),
              })
            }
            onStartTraining={(personId, formId) =>
              dispatch({
                type: "START_FORM_TRAINING",
                personId,
                formId,
                now: Date.now(),
              })
            }
            onToggleInstructorAutomation={(collaboratorId, enabled) =>
              dispatch({
                type: "TOGGLE_INSTRUCTOR_AUTOMATION",
                collaboratorId,
                enabled,
                now: Date.now(),
              })
            }
          />
        ) : activeView === "admin" ? (
          <AdminEmailView
            upgrades={state.upgrades}
            activeMembers={state.school.activeMembers}
            euros={state.school.euros}
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
            onFoundSchool={(details) => dispatch({ type: "FOUND_SCHOOL", details, now: Date.now() })}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
            reduceMotion={reduceMotion}
            onReduceMotionChange={setReduceMotion}
          />
        )}
      </div>
      <footer className="status-bar"><span>Tutti i messaggi sono aggiornati.</span><span>Connesso localmente</span><b title={state.school.motto || undefined}>{state.school.name}</b></footer>
    </div>
  );
}

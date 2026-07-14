import { useEffect, useState } from "react";
import { Icon } from "../components/common/Icon";
import { AppRail, type AppView } from "../components/outlook-shell/AppRail";
import { CommandBar } from "../components/outlook-shell/CommandBar";
import { Composer } from "../components/outlook-shell/Composer";
import { DayPanel } from "../components/outlook-shell/DayPanel";
import { FolderPane, type MailFolder } from "../components/outlook-shell/FolderPane";
import { MessageDetail } from "../components/outlook-shell/MessageDetail";
import { MessageList } from "../components/outlook-shell/MessageList";
import { SentMailDetail } from "../components/outlook-shell/SentMailDetail";
import { TitleBar } from "../components/outlook-shell/TitleBar";
import { OverviewView } from "../features/OverviewView";
import { EventsView } from "../features/events/EventsView";
import { UpgradesView } from "../features/upgrades/UpgradesView";
import { useGameEngine } from "../game/useGameEngine";

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
  const selectedMessage = state.messages.find((message) => message.id === selectedMessageId);
  const selectedSentEmail = state.emails.find((email) => email.id === selectedSentEmailId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        view !== "mail" ||
        mailFolder !== "inbox" ||
        selectedMessageId !== null ||
        event.repeat ||
        targetConsumesKeyboard(event.target)
      ) return;
      dispatch({ type: "WRITE", now: Date.now() });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, mailFolder, selectedMessageId, view]);

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
  return (
    <div className="application-shell">
      <TitleBar />
      <CommandBar onCompose={() => { setView("mail"); setMailFolder("inbox"); setSelectedMessageId(null); }} />
      <div className={view === "mail" ? "workspace" : "workspace overview-workspace"}>
        <AppRail view={view} onChange={setView} />
        {view === "mail" ? (
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
        ) : view === "upgrades" ? (
          <UpgradesView
            state={state}
            onBuyUpgrade={(upgradeId) =>
              dispatch({ type: "BUY_UPGRADE", upgradeId, now: Date.now() })
            }
          />
        ) : view === "events" ? (
          <EventsView
            state={state}
            onStart={(definitionId) =>
              dispatch({ type: "START_ACQUISITION_EVENT", definitionId, now: Date.now() })
            }
          />
        ) : (
          <OverviewView view={view} state={state} />
        )}
      </div>
      <footer className="status-bar"><span>Tutti i messaggi sono aggiornati.</span><span>Connesso localmente</span><b>{state.school.name}</b></footer>
    </div>
  );
}

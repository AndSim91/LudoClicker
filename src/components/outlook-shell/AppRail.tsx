import { Icon, type IconName } from "../common/Icon";

export type AppView =
  | "mail"
  | "events"
  | "contacts"
  | "upgrades"
  | "statistics"
  | "settings";

const items: { id: AppView; label: string; icon: IconName }[] = [
  { id: "mail", label: "Posta", icon: "mail" },
  { id: "events", label: "Eventi", icon: "flag" },
  { id: "contacts", label: "Iscritti", icon: "people" },
  { id: "upgrades", label: "Miglioramenti", icon: "spark" },
  { id: "statistics", label: "Attività", icon: "tasks" },
  { id: "settings", label: "Impostazioni", icon: "settings" },
];

export function AppRail({ view, onChange }: { view: AppView; onChange: (view: AppView) => void }) {
  return (
    <nav className="app-rail" aria-label="Applicazioni">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={view === item.id ? "rail-item active" : "rail-item"}
          onClick={() => onChange(item.id)}
          aria-current={view === item.id ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

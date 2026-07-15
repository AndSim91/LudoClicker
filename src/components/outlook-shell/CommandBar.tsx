import { Icon } from "../common/Icon";

interface CommandBarProps {
  onCompose: () => void;
  onMarkAllRead: () => void;
  canMarkAllRead: boolean;
}

export function CommandBar({ onCompose, onMarkAllRead, canMarkAllRead }: CommandBarProps) {
  return (
    <div className="command-bar">
      <button className="primary-command" type="button" onClick={onCompose}>
        <Icon name="plus" /> Nuovo messaggio <Icon name="chevron" />
      </button>
      <div className="command-divider" />
      <button className="command" type="button" disabled><Icon name="trash" /> Elimina</button>
      <button className="command" type="button" disabled>Sposta in <Icon name="chevron" /></button>
      <button
        className="command"
        type="button"
        onClick={onMarkAllRead}
        disabled={!canMarkAllRead}
      >
        <Icon name="mail" /> Segna tutto come letto
      </button>
      <span className="command-spacer" />
      <button className="icon-command" type="button" aria-label="Cerca"><Icon name="search" /></button>
    </div>
  );
}

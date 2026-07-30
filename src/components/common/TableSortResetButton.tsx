export function TableSortResetButton({
  disabled,
  label,
  onReset,
}: {
  disabled: boolean;
  label: string;
  onReset: () => void;
}) {
  return (
    <button
      type="button"
      className="table-sort-reset-button"
      aria-label={`Ripristina ordinamento ${label}`}
      disabled={disabled}
      onClick={onReset}
    >
      <span aria-hidden="true">↺</span>
      Ripristina
    </button>
  );
}

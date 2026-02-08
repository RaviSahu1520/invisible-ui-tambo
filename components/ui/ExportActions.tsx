export interface ExportFormat {
  id: string;
  label: string;
  icon?: string;
}

export interface ExportActionsProps {
  show?: boolean;
  formats: ExportFormat[];
  onExport?: (formatId: string) => void;
}

export function ExportActions({
  show = true,
  formats,
  onExport,
}: ExportActionsProps) {
  if (!show) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {formats.map((format) => (
        <button
          key={format.id}
          type="button"
          onClick={() => onExport?.(format.id)}
          className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm transition-all duration-200 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {format.icon && <span>{format.icon}</span>}
          <span>Export {format.label}</span>
        </button>
      ))}
    </div>
  );
}

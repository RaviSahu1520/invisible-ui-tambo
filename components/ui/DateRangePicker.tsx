export interface DateRangePickerProps {
  show?: boolean;
  startDate?: string;
  endDate?: string;
  onChange?: (start: string, end: string) => void;
}

export function DateRangePicker({
  show = true,
  startDate,
  endDate,
  onChange,
}: DateRangePickerProps) {
  if (!show) return null;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value, endDate || "");
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(startDate || "", e.target.value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={startDate || ""}
        onChange={handleStartChange}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-muted-foreground">to</span>
      <input
        type="date"
        value={endDate || ""}
        onChange={handleEndChange}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </div>
  );
}

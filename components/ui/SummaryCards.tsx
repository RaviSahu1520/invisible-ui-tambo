export interface SummaryCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
}

export interface SummaryCardsProps {
  show?: boolean;
  cards: SummaryCard[];
}

export function SummaryCards({ show = true, cards }: SummaryCardsProps) {
  if (!show) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-sm text-muted-foreground">{card.title}</p>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          {card.change !== undefined && (
            <p
              className={`mt-2 text-sm ${
                card.trend === "up"
                  ? "text-green-600 dark:text-green-400"
                  : card.trend === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {card.trend === "up" && "+"}
              {card.change}%
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

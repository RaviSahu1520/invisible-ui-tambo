/**
 * Hybrid Data Store
 *
 * Manages data with a hybrid approach:
 * - Uses mock financial data by default
 * - Allows user data to override mock data
 * - Stores everything in memory
 * - Never generates/hallucinates salary values
 */

/**
 * Data source type
 */
export type DataSource = "mock" | "user" | "computed";

/**
 * Data entry with metadata
 */
export interface DataEntry<T = unknown> {
  value: T;
  source: DataSource;
  timestamp: number;
}

/**
 * Mock financial data
 * These are realistic sample values for demonstration
 */
const MOCK_DATA: Record<string, unknown> = {
  // Salary data
  "salary.lastMonth": 5000,
  "salary.currentMonth": 5500,
  "salary.previousMonth": 4800,

  // Income breakdown
  "income.baseSalary": 4500,
  "income.bonuses": 500,
  "income.overtime": 500,
  "income.other": 0,

  // Expenses
  "expenses.rent": 1500,
  "expenses.utilities": 200,
  "expenses.groceries": 400,
  "expenses.transport": 150,
  "expenses.entertainment": 200,
  "expenses.savings": 1000,
  "expenses.other": 300,

  // Budget categories
  "budget.total": 5000,
  "budget.remaining": 750,
  "budget.spent": 4250,

  // Accounts
  "accounts.checking": 2500,
  "accounts.savings": 15000,
  "accounts.investments": 35000,
  "accounts.retirement": 25000,

  // Debt
  "debt.creditCard": 800,
  "debt.studentLoan": 12000,
  "debt.carLoan": 8000,
  "debt.mortgage": 180000,

  // Goals
  "goals.emergencyFund": { target: 15000, current: 12000 },
  "goals.vacation": { target: 3000, current: 800 },
  "goals.newCar": { target: 20000, current: 5000 },

  // Time periods
  "time.currentMonth": new Date().toISOString().slice(0, 7),
  "time.lastMonth": new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7),
};

/**
 * Fields that should NEVER be mocked
 * (Salary and sensitive financial data must come from user)
 */
const USER_REQUIRED_FIELDS: Set<string> = new Set([
  "salary.lastMonth",
  "salary.currentMonth",
  "salary.previousMonth",
  "user.firstName",
  "user.lastName",
  "user.email",
  "user.phone",
]);

/**
 * Fields that can be computed from other data
 */
const COMPUTABLE_FIELDS: Record<string, (data: DataStore) => unknown> = {
  "salary.change": (store) => {
    const current = store.getNumber("salary.currentMonth");
    const last = store.getNumber("salary.lastMonth");
    if (current !== null && last !== null) {
      return current - last;
    }
    return null;
  },
  "salary.changePercent": (store) => {
    const current = store.getNumber("salary.currentMonth");
    const last = store.getNumber("salary.lastMonth");
    if (current !== null && last !== null && last !== 0) {
      return ((current - last) / last) * 100;
    }
    return null;
  },
  "salary.trend": (store) => {
    const change = store.getNumber("salary.change");
    if (change !== null) {
      return change >= 0 ? "up" : "down";
    }
    return "neutral";
  },
  "expenses.total": (store) => {
    const rent = store.getNumber("expenses.rent") ?? 0;
    const utilities = store.getNumber("expenses.utilities") ?? 0;
    const groceries = store.getNumber("expenses.groceries") ?? 0;
    const transport = store.getNumber("expenses.transport") ?? 0;
    const entertainment = store.getNumber("expenses.entertainment") ?? 0;
    const savings = store.getNumber("expenses.savings") ?? 0;
    const other = store.getNumber("expenses.other") ?? 0;
    return rent + utilities + groceries + transport + entertainment + savings + other;
  },
  "income.total": (store) => {
    const base = store.getNumber("income.baseSalary") ?? 0;
    const bonuses = store.getNumber("income.bonuses") ?? 0;
    const overtime = store.getNumber("income.overtime") ?? 0;
    const other = store.getNumber("income.other") ?? 0;
    return base + bonuses + overtime + other;
  },
  "accounts.netWorth": (store) => {
    const checking = store.getNumber("accounts.checking") ?? 0;
    const savings = store.getNumber("accounts.savings") ?? 0;
    const investments = store.getNumber("accounts.investments") ?? 0;
    const retirement = store.getNumber("accounts.retirement") ?? 0;
    const creditCard = store.getNumber("debt.creditCard") ?? 0;
    const studentLoan = store.getNumber("debt.studentLoan") ?? 0;
    const carLoan = store.getNumber("debt.carLoan") ?? 0;
    const mortgage = store.getNumber("debt.mortgage") ?? 0;

    const assets = checking + savings + investments + retirement;
    const liabilities = creditCard + studentLoan + carLoan + mortgage;
    return assets - liabilities;
  },
};

/**
 * Components that can access specific data keys
 * This restricts data exposure to only what's needed
 */
const COMPONENT_DATA_ACCESS: Record<string, string[]> = {
  SummaryCards: [
    "salary.lastMonth",
    "salary.currentMonth",
    "salary.change",
    "salary.changePercent",
    "salary.trend",
    "expenses.total",
    "income.total",
    "accounts.netWorth",
  ],
  ChartView: ["salary.lastMonth", "salary.currentMonth", "income.total", "expenses.total"],
  InsightSummary: [
    "salary.change",
    "salary.changePercent",
    "budget.remaining",
    "goals.emergencyFund",
    "goals.vacation",
  ],
  EmptyState: [],
  InputForm: [],
  DateRangePicker: ["time.currentMonth", "time.lastMonth"],
  ExportActions: [],
  PredictiveActionBar: [],
  GuardrailModal: [],
};

/**
 * Hybrid Data Store class
 */
export class DataStore {
  private data: Map<string, DataEntry> = new Map();
  private userProvidedKeys: Set<string> = new Set();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with mock data (excluding user-required fields)
   */
  private initializeMockData(): void {
    for (const [key, value] of Object.entries(MOCK_DATA)) {
      if (!USER_REQUIRED_FIELDS.has(key)) {
        this.data.set(key, {
          value,
          source: "mock",
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Get a value by key
   * Returns null if not found
   */
  get(key: string): unknown {
    // Check if it's a computed field
    if (COMPUTABLE_FIELDS[key]) {
      return COMPUTABLE_FIELDS[key](this);
    }

    const entry = this.data.get(key);
    return entry?.value ?? null;
  }

  /**
   * Get a number value
   */
  getNumber(key: string): number | null {
    const value = this.get(key);
    return typeof value === "number" ? value : null;
  }

  /**
   * Get a string value
   */
  getString(key: string): string | null {
    const value = this.get(key);
    return typeof value === "string" ? value : null;
  }

  /**
   * Get a value with its source metadata
   */
  withSource(key: string): DataEntry | null {
    if (COMPUTABLE_FIELDS[key]) {
      return {
        value: COMPUTABLE_FIELDS[key](this),
        source: "computed",
        timestamp: Date.now(),
      };
    }
    return this.data.get(key) ?? null;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.data.has(key) || COMPUTABLE_FIELDS[key] !== undefined;
  }

  /**
   * Check if a value was provided by the user (not mocked)
   */
  isUserProvided(key: string): boolean {
    return this.userProvidedKeys.has(key);
  }

  /**
   * Check if a value exists (user or mock)
   */
  exists(key: string): boolean {
    return this.has(key) && this.get(key) !== null;
  }

  /**
   * Check if required salary data is available
   */
  hasSalaryData(): boolean {
    const lastMonth = this.getNumber("salary.lastMonth");
    const currentMonth = this.getNumber("salary.currentMonth");
    return lastMonth !== null && currentMonth !== null;
  }

  /**
   * Set a value (user-provided)
   * User data always overrides mock data
   */
  set(key: string, value: unknown): void {
    this.data.set(key, {
      value,
      source: "user",
      timestamp: Date.now(),
    });
    this.userProvidedKeys.add(key);
  }

  /**
   * Set multiple values at once
   */
  setMany(entries: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value);
    }
  }

  /**
   * Delete a value
   * Note: This doesn't restore mock data - the value becomes unavailable
   */
  delete(key: string): void {
    this.data.delete(key);
    this.userProvidedKeys.delete(key);
  }

  /**
   * Reset a value to its mock default (if available)
   */
  resetToMock(key: string): boolean {
    if (MOCK_DATA[key] !== undefined && !USER_REQUIRED_FIELDS.has(key)) {
      this.data.set(key, {
        value: MOCK_DATA[key],
        source: "mock",
        timestamp: Date.now(),
      });
      this.userProvidedKeys.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
    this.userProvidedKeys.clear();
    this.initializeMockData();
  }

  /**
   * Get all data for a specific component
   * Only returns data that the component is allowed to access
   */
  forComponent(componentType: string): Record<string, unknown> {
    const allowedKeys = COMPONENT_DATA_ACCESS[componentType] || [];
    const result: Record<string, unknown> = {};

    for (const key of allowedKeys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[string, DataEntry]> {
    return this.data.entries();
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * Get data source summary
   */
  getSourceSummary(): {
    mock: number;
    user: number;
    computed: number;
  } {
    let mock = 0;
    let user = 0;

    for (const [_key, entry] of this.data) {
      if (entry.source === "mock") mock++;
      if (entry.source === "user") user++;
    }

    return {
      mock,
      user,
      computed: Object.keys(COMPUTABLE_FIELDS).length,
    };
  }

  /**
   * Export data (for debugging/persistence)
   */
  export(): Record<string, DataEntry> {
    return Object.fromEntries(this.data.entries());
  }

  /**
   * Import data
   */
  import(data: Record<string, DataEntry>): void {
    for (const [key, entry] of Object.entries(data)) {
      this.data.set(key, entry);
      if (entry.source === "user") {
        this.userProvidedKeys.add(key);
      }
    }
  }
}

/**
 * Singleton instance
 */
export const dataStore = new DataStore();

/**
 * Helper functions for common operations
 */

/**
 * Process form data and update store
 */
export function processFormData(formData: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(formData)) {
    // Convert string numbers to actual numbers
    let finalValue = value;
    if (typeof value === "string" && !isNaN(Number(value))) {
      finalValue = Number(value);
    }
    dataStore.set(key, finalValue);
  }
}

/**
 * Map form field names to data store keys
 */
export function mapFormFieldToDataKey(fieldName: string): string {
  const mapping: Record<string, string> = {
    lastMonthSalary: "salary.lastMonth",
    currentMonthSalary: "salary.currentMonth",
    previousMonthSalary: "salary.previousMonth",
    baseSalary: "income.baseSalary",
    monthlyRent: "expenses.rent",
    monthlyUtilities: "expenses.utilities",
    monthlyGroceries: "expenses.groceries",
    checkingAccount: "accounts.checking",
    savingsAccount: "accounts.savings",
    totalExpenses: "expenses.total",
    category: "expenses.category",
  };

  return mapping[fieldName] || fieldName;
}

/**
 * Get salary comparison data for components
 */
export function getSalaryComparisonData(): {
  lastMonth: number | null;
  currentMonth: number | null;
  change: number | null;
  changePercent: number | null;
  trend: "up" | "down" | "neutral";
  hasData: boolean;
} {
  const lastMonth = dataStore.getNumber("salary.lastMonth");
  const currentMonth = dataStore.getNumber("salary.currentMonth");
  const change = dataStore.getNumber("salary.change");
  const changePercent = dataStore.getNumber("salary.changePercent");
  const trend = (dataStore.get("salary.trend") as "up" | "down" | "neutral") ?? "neutral";

  return {
    lastMonth,
    currentMonth,
    change,
    changePercent,
    trend,
    hasData: lastMonth !== null && currentMonth !== null,
  };
}

/**
 * Get formatted salary cards data
 */
export function getSalaryCardsData(): Array<{
  title: string;
  value: string | number;
  trend: "up" | "down" | "neutral";
}> {
  const data = getSalaryComparisonData();

  if (!data.hasData) {
    return [];
  }

  const last = data.lastMonth ?? 0;
  const current = data.currentMonth ?? 0;
  const change = data.change ?? 0;
  const percent = data.changePercent?.toFixed(1) ?? "0";

  return [
    { title: "Last Month", value: last, trend: "neutral" },
    { title: "Current Month", value: current, trend: "neutral" },
    {
      title: "Difference",
      value: change >= 0 ? `+$${change}` : `-$${Math.abs(change)}`,
      trend: data.trend,
    },
    { title: "Change %", value: `${percent}%`, trend: data.trend },
  ];
}

/**
 * Check if salary data needs to be collected
 */
export function needsSalaryData(): boolean {
  return !dataStore.hasSalaryData();
}

const usePostgres = process.env.DB_HOST && process.env.DB_HOST !== 'localhost';

export const sql = {
  now: usePostgres ? 'NOW()' : 'CURRENT_TIMESTAMP',
  
  interval: (hours: number) => usePostgres 
    ? `NOW() - INTERVAL '${hours} hours'` 
    : `datetime('now', '-${hours} hours')`,
  
  intervalDays: (days: number) => usePostgres 
    ? `NOW() - INTERVAL '${days} days'` 
    : `datetime('now', '-${days} days')`,
  
  uuid: usePostgres ? 'gen_random_uuid()::text' : `'${Math.random().toString(36).substring(2) + Date.now().toString(36)}'`,

  filter: (column: string, value: number | boolean) => usePostgres
    ? `${column} = ${value}`
    : `${column} = ${value ? 1 : 0}`,

  coalesce: (columns: string[], defaultValue: string) => {
    return `COALESCE(${columns.join(', ')}, ${defaultValue})`;
  },

  caseWhen: (conditions: { when: string; then: string }[], elseVal: string) => {
    const cases = conditions.map(c => `WHEN ${c.when} THEN ${c.then}`).join(' ');
    return `CASE ${cases} ELSE ${elseVal} END`;
  },

  countFilter: (condition: string) => usePostgres
    ? `COUNT(*) FILTER (WHERE ${condition})`
    : `SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END)`,

  like: (column: string, value: string) => `${column} LIKE '%${value}%'`,

  limitOffset: (limit: number, offset: number) => `LIMIT ${limit} OFFSET ${offset}`,
};

export function getPlaceholders(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `$${i + 1}`);
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}
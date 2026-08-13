/**
 * Returns the current date in YYYY-MM-DD format based on the given timezone.
 * Defaults to Asia/Kolkata (IST).
 */
export function getBusinessDate(timeZone: string = 'Asia/Kolkata'): string {
  const date = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Returns a list of consecutive business dates starting from the current business date.
 * Used for the booking calendar.
 */
export function getUpcomingBusinessDates(days: number = 14, timeZone: string = 'Asia/Kolkata'): string[] {
  const dates: string[] = [];
  const baseDate = new Date();
  
  for (let i = 0; i < days; i++) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + i);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

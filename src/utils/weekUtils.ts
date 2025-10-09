/**
 * Get ISO week number from a date
 */
export const getISOWeek = (date: Date): { week: number; year: number } => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  
  return { week, year };
};

/**
 * Get the current week's date range (Sunday to Saturday)
 */
export const getCurrentWeekRange = (): { week: number; year: number } => {
  const today = new Date();
  return getISOWeek(today);
};

/**
 * What this file does: provides quarter-based date helpers used by reporting and background jobs.
 * What calls it: src/services/reportingService.ts and src/services/backgroundJobService.ts.
 * What it calls: no application modules; this is a pure date utility.
 * One thing a junior engineer would likely get wrong when writing something similar: mixing local timezone assumptions into reporting windows and creating off-by-one-day quarter bugs.
 */
export function currentQuarterLabel(referenceDate: Date): string {
  const month = referenceDate.getUTCMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${referenceDate.getUTCFullYear()}-Q${quarter}`;
}

export function getQuarterBounds(quarterLabel: string): { start: Date; end: Date } {
  const [yearText, quarterText] = quarterLabel.split("-Q");
  const year = Number(yearText);
  const quarter = Number(quarterText);

  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 1, 0, 0, 0));

  // ⚠️ SENIOR NOTE: Exclusive end bounds are much safer than trying to hand-build `23:59:59` style timestamp cutoffs.
  return { start, end };
}

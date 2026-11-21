function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function addWorkingDays(start: Date, days: number, blackoutDates: string[] = []) {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dateStr = result.toISOString().split("T")[0];
    if (isWeekend(result) || blackoutDates.includes(dateStr)) {
      continue;
    }
    added++;
  }
  return result;
}

function formatWindow(start: Date, end: Date) {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-NG", options);
  const endStr = end.toLocaleDateString("en-NG", options);
  return `${startStr} – ${endStr}`;
}

export function computeExpectedDeliveryWindow({
  zoneEtaText,
  cutOffTime = "15:00",
  blackoutDates = [],
  maxLeadTimeDays = 0,
  now = new Date(),
}: {
  zoneEtaText?: string;
  cutOffTime?: string;
  blackoutDates?: string[];
  maxLeadTimeDays?: number;
  now?: Date;
}) {
  // Simple implementation - add working days based on cut-off
  const [cutHour, cutMin] = cutOffTime.split(":").map((x) => parseInt(x));
  const current = new Date(now);
  let orderTime = new Date(current);

  // If after cut-off, add 1 day
  if (orderTime.getHours() > cutHour || (orderTime.getHours() === cutHour && orderTime.getMinutes() > cutMin)) {
    orderTime.setDate(orderTime.getDate() + 1);
  }

  let workingDays = 2; // default
  // If zoneEtaText suggests different, try to parse - but keep simple
  const start = addWorkingDays(orderTime, 1 + maxLeadTimeDays, blackoutDates);
  const end = addWorkingDays(start, 1, blackoutDates);
  return zoneEtaText || formatWindow(start, end);
}

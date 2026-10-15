/**
 * Timezone and Date normalization utilities for VRPI HRMS.
 * All temporal timestamps are stored in PostgreSQL in UTC.
 * Organization shifts and calendar day boundaries are calculated in the organization timezone.
 */

export function getOrgDateString(utcDate: Date = new Date(), timezone: string = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(utcDate); // Returns YYYY-MM-DD
}

export function getOrgTimeString(utcDate: Date = new Date(), timezone: string = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(utcDate); // Returns HH:mm
}

export function isPunchLate(
  punchTime: Date,
  shiftStartTime: string = "09:00",
  graceMinutes: number = 15,
  timezone: string = "Asia/Kolkata"
): boolean {
  const punchTimeString = getOrgTimeString(punchTime, timezone);
  const [punchH, punchM] = punchTimeString.split(":").map(Number);
  const [shiftH, shiftM] = shiftStartTime.split(":").map(Number);

  const punchTotalMinutes = punchH * 60 + punchM;
  const shiftAllowedMinutes = shiftH * 60 + shiftM + graceMinutes;

  return punchTotalMinutes > shiftAllowedMinutes;
}

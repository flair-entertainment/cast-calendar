// Lists you may want to change live here, in one place.

export const ROLES = ["dancer", "specialist", "actor", "singer"] as const;
export type Role = (typeof ROLES)[number];

export const LOCATIONS = ["UK", "Jersey", "Europe"] as const;
export type Location = (typeof LOCATIONS)[number];

export const STATUSES = ["available", "maybe", "unavailable"] as const;
export type Status = (typeof STATUSES)[number];

// Someone who hasn't updated in this many days gets flagged.
export const STALE_DAYS = 60;

// "Time needed" options on the Compare and Overview pages (24h clock).
export const TIME_WINDOWS = {
  full: { label: "Full day", start: "08:00", end: "23:00" },
  day: { label: "Daytime", start: "09:00", end: "17:00" },
  eve: { label: "Evening", start: "17:00", end: "22:00" },
} as const;
export type WindowKey = keyof typeof TIME_WINDOWS | "custom";

export const TIMEZONE = "Europe/London";

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

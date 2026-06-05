import type { Role } from "@/hooks/useRole";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

const USERS_KEY = "hms-qa-users";
const ACTIVE_USER_KEY = "hms-qa-active-user";
const USERS_EVT = "hms-qa-users-change";

export function getUsers(): ManagedUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const seed: ManagedUser[] = [
        { id: "u-default", name: "Suryani Lestari", email: "suryanilestari123@gmail.com", role: "admin", createdAt: new Date().toISOString() },
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(seed));
      localStorage.setItem(ACTIVE_USER_KEY, seed[0].id);
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUsers(users: ManagedUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent(USERS_EVT));
}

export function getActiveUserId(): string {
  return localStorage.getItem(ACTIVE_USER_KEY) || getUsers()[0]?.id || "";
}

export function setActiveUserId(id: string) {
  localStorage.setItem(ACTIVE_USER_KEY, id);
  window.dispatchEvent(new CustomEvent(USERS_EVT));
}

export function getActiveUser(): ManagedUser | undefined {
  const id = getActiveUserId();
  return getUsers().find((u) => u.id === id);
}

export const USERS_EVENT = USERS_EVT;

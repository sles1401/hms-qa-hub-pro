import { useEffect, useState, useCallback } from "react";

export type Role = "admin" | "viewer";
const KEY = "hms-qa-role";
const EVT = "hms-qa-role-change";

export function getStoredRole(): Role {
  const v = localStorage.getItem(KEY);
  return v === "admin" ? "admin" : "viewer";
}

export function setStoredRole(r: Role) {
  localStorage.setItem(KEY, r);
  window.dispatchEvent(new CustomEvent(EVT, { detail: r }));
}

export function useRole() {
  const [role, setRole] = useState<Role>(getStoredRole);
  useEffect(() => {
    const h = () => setRole(getStoredRole());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  const change = useCallback((r: Role) => setStoredRole(r), []);
  return { role, setRole: change, isAdmin: role === "admin" };
}

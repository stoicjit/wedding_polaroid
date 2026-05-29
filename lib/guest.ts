import { useSyncExternalStore } from "react";

export const GUEST_NAME_KEY = "guestName";
const GUEST_NAME_EVENT = "guestnamechange";

export function loadGuestName() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(GUEST_NAME_KEY) ?? "";
}

export function saveGuestName(name: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(GUEST_NAME_KEY, name.trim());
  window.dispatchEvent(new Event(GUEST_NAME_EVENT));
}

function subscribeGuestName(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = () => onStoreChange();
  const handleGuestNameChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(GUEST_NAME_EVENT, handleGuestNameChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(GUEST_NAME_EVENT, handleGuestNameChange);
  };
}

export function useGuestName() {
  return useSyncExternalStore(subscribeGuestName, loadGuestName, () => "");
}

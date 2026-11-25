import { useSyncExternalStore } from 'react';

/** An independent subscription channel for a shared browser preference or engine. */
export function createChannel() {
  let version = 0;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const snapshot = () => version;
  function atom<T>(initial: T) {
    let value = initial;
    return { get value() { return value; }, set value(next: T) {
      if (Object.is(value, next)) return;
      value = next; version++; listeners.forEach(listener => listener());
    } };
  }
  function derived<T>(read: () => T) { return { get value() { return read(); } }; }
  function useVersion() { useSyncExternalStore(subscribe, snapshot, snapshot); }
  return { atom, derived, useVersion };
}

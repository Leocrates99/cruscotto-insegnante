import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./store";

/** Si iscrive allo store: il componente si ri-renderizza a ogni cambiamento. */
export function useStore() {
  return useSyncExternalStore(subscribe, getState);
}

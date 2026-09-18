import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true somente após o primeiro paint no cliente — evita divergência entre HTML do servidor e estado do localStorage. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

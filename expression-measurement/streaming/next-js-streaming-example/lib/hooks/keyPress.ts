import { DependencyList, useEffect } from "react";

export function useKeypress(key: string, callback: () => void, deps: DependencyList, preventDefault: boolean = true) {
  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.key === key) {
        if (preventDefault) event.preventDefault();
        callback();
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, deps);
}

import { useEffect, useState } from "react";

export const useDebouncedValue = <T>(value: T, delay = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
};

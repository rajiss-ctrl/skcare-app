// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of no changes. Use for search inputs to
 * avoid filtering on every keystroke.
 *
 * @param value  - The value to debounce
 * @param delay  - Debounce delay in milliseconds (default 350ms)
 */
const useDebounce = <T>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;

import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates
 * Prevents excessive re-renders and expensive operations
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {*} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timer on value change or unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced search hook - optimized for search inputs
 * Returns both immediate value (for input) and debounced value (for filtering)
 * 
 * @param {string} initialValue - Initial search value
 * @param {number} delay - Debounce delay (default: 300ms)
 * @returns {object} - { searchTerm, debouncedSearchTerm, setSearchTerm }
 */
export function useDebouncedSearch(initialValue = '', delay = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
  };
}

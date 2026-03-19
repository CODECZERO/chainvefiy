import { useCallback, useRef } from 'react';
import { useAppDispatch } from './use-redux';

/**
 * A hook that returns a debounced version of the dispatch function for a specific action.
 * Useful for preventing multiple rapid fetch calls.
 */
export function useDebouncedDispatch() {
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedDispatch = useCallback((action: any, delay: number = 500) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            dispatch(action);
            timeoutRef.current = null;
        }, delay);
    }, [dispatch]);

    return debouncedDispatch;
}

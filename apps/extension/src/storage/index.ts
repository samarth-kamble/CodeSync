import { useState, useEffect, useCallback } from 'react';
import {
  type AuthState,
  type SelectedRepository,
  type UserPreferences,
  type SyncHistoryEntry,
  type RetryQueueItem,
  DEFAULT_AUTH_STATE,
  DEFAULT_PREFERENCES,
} from '@leetsync/shared';

export interface StorageSchema {
  auth: AuthState;
  selectedRepo: SelectedRepository | null;
  preferences: UserPreferences;
  syncHistory: SyncHistoryEntry[];
  retryQueue: RetryQueueItem[];
}

export const STORAGE_DEFAULTS: StorageSchema = {
  auth: DEFAULT_AUTH_STATE,
  selectedRepo: null,
  preferences: DEFAULT_PREFERENCES,
  syncHistory: [],
  retryQueue: [],
};

const isChromeStorageAvailable = () => {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
};

export async function getStorageItem<K extends keyof StorageSchema>(
  key: K,
): Promise<StorageSchema[K]> {
  if (!isChromeStorageAvailable()) {
    try {
      const item = localStorage.getItem(`codesync_${key}`);
      return item ? JSON.parse(item) : STORAGE_DEFAULTS[key];
    } catch {
      return STORAGE_DEFAULTS[key];
    }
  }

  const result = await chrome.storage.local.get(key);
  return (result[key] as StorageSchema[K]) ?? STORAGE_DEFAULTS[key];
}

export async function setStorageItem<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): Promise<void> {
  if (!isChromeStorageAvailable()) {
    try {
      localStorage.setItem(`codesync_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[CodeSync Storage] LocalStorage write error:', e);
    }
    return;
  }

  await chrome.storage.local.set({ [key]: value });
}

export function useStorage<K extends keyof StorageSchema>(
  key: K,
): [StorageSchema[K], (newValue: StorageSchema[K] | ((prev: StorageSchema[K]) => StorageSchema[K])) => Promise<void>, boolean] {
  const [value, setValue] = useState<StorageSchema[K]>(STORAGE_DEFAULTS[key]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    getStorageItem(key).then((storedValue) => {
      if (isMounted) {
        setValue(storedValue);
        setLoading(false);
      }
    });

    if (isChromeStorageAvailable()) {
      const listener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string,
      ) => {
        if (areaName === 'local' && changes[key]) {
          const nextVal = (changes[key].newValue as StorageSchema[K]) ?? STORAGE_DEFAULTS[key];
          if (isMounted) {
            setValue(nextVal);
          }
        }
      };

      chrome.storage.onChanged.addListener(listener);
      return () => {
        isMounted = false;
        chrome.storage.onChanged.removeListener(listener);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [key]);

  const update = useCallback(
    async (
      newValue: StorageSchema[K] | ((prev: StorageSchema[K]) => StorageSchema[K]),
    ) => {
      const nextValue =
        typeof newValue === 'function'
          ? (newValue as (prev: StorageSchema[K]) => StorageSchema[K])(value)
          : newValue;

      setValue(nextValue);
      await setStorageItem(key, nextValue);
    },
    [key, value],
  );

  return [value, update, loading];
}


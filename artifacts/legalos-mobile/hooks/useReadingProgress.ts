import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const READ_KEY = 'legalos_chapters_read';
const ACTIONS_KEY = 'legalos_actions_done';

export function useReadingProgress() {
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [doneActions, setDoneActions] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(READ_KEY),
      AsyncStorage.getItem(ACTIONS_KEY),
    ]).then(([read, actions]) => {
      if (read) setReadChapters(new Set(JSON.parse(read) as string[]));
      if (actions) setDoneActions(new Set(JSON.parse(actions) as string[]));
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const markRead = useCallback((chapterId: string) => {
    setReadChapters(prev => {
      if (prev.has(chapterId)) return prev;
      const next = new Set(prev).add(chapterId);
      AsyncStorage.setItem(READ_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const toggleAction = useCallback((actionKey: string) => {
    setDoneActions(prev => {
      const next = new Set(prev);
      if (next.has(actionKey)) next.delete(actionKey);
      else next.add(actionKey);
      AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  return {
    readChapters,
    doneActions,
    markRead,
    toggleAction,
    readCount: readChapters.size,
    doneCount: doneActions.size,
    ready,
  };
}

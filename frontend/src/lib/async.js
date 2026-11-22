import { useCallback, useRef, useState } from 'react';

export function useBusy() {
  const [busyKey, setBusyKey] = useState('');
  const lock = useRef(false);
  const run = useCallback(async (keyOrFn, maybeFn) => {
    const key = typeof keyOrFn === 'function' ? 'busy' : keyOrFn;
    const fn = typeof keyOrFn === 'function' ? keyOrFn : maybeFn;
    if (lock.current || typeof fn !== 'function') return false;
    lock.current = true;
    setBusyKey(key);
    const started = Date.now();
    try {
      await fn();
      return true;
    } finally {
      const wait = 450 - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lock.current = false;
      setBusyKey('');
    }
  }, []);
  return { busy: busyKey !== '', busyKey, run };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Không đọc được tệp'));
    reader.readAsDataURL(file);
  });
}


export const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };
  
export const withRetry = async <T,>(factory: () => Promise<T>, attempts = 2, ms = 5000): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await withTimeout(factory(), ms);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
};

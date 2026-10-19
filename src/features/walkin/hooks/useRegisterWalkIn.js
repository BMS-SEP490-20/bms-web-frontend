import { useState, useCallback } from 'react';
import { walkInApi } from '../api/walkInApi';

export function useRegisterWalkIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const register = useCallback(async (body) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await walkInApi.register(body);
      setResult(res);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { register, loading, error, result, reset };
}

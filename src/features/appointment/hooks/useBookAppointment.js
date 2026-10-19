import { useCallback, useState } from 'react';
import { bookAppointment } from '../api/appointmentApi';

export function useBookAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const book = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookAppointment(payload);
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { book, submit: book, loading, isSubmitting: loading, error, result, reset };
}

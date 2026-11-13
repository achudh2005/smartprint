import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * OtpVerificationForm – Deprecated.
 * OTP verification is removed in favor of direct email & password authentication.
 * Automatically redirects to clear any stale state.
 */
export default function OtpVerificationForm({ onBack, onSuccess }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof onBack === 'function') {
      onBack();
    } else if (typeof onSuccess === 'function') {
      onSuccess();
    } else {
      navigate('/login', { replace: true });
    }
  }, [onBack, onSuccess, navigate]);

  return null;
}

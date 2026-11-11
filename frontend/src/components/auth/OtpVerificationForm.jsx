import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw, KeyRound, Info } from 'lucide-react';
import { Button, Alert } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function OtpVerificationForm({ email, initialOtp = '', onSuccess, onBack }) {
  const { verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState(initialOtp || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (initialOtp && !otp) {
      setOtp(initialOtp);
    }
  }, [initialOtp]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, cleanOtp);
      toast.success('Email verified successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Please check the code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      const res = await resendOtp(email);
      const newDevOtp = res?.data?.devOtp;
      if (newDevOtp) {
        setOtp(newDevOtp);
        toast.success(`Verification code: ${newDevOtp}`);
      } else {
        toast.success('A new 6-digit code has been sent to your email.');
      }
      setCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again later.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-[#0E7490] rounded-lg mb-4 text-white">
          <KeyRound size={20} strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text)] tracking-tight">Check your email</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          We sent a 6-digit confirmation code to:
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
          <Mail size={13} className="text-[#0E7490] shrink-0" />
          <span className="font-semibold">{email}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            {initialOtp && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--accent-tint)] border border-[#0E7490]/30 text-xs text-[#0E7490]">
                <Info size={14} className="shrink-0" />
                <span>Sandbox mode: Code <strong>{initialOtp}</strong> pre-filled for testing.</span>
              </div>
            )}

            <div>
              <label className="label">Verification Code (6 digits)</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                    if (error) setError('');
                  }}
                  placeholder="123456"
                  autoFocus
                  required
                  className="input font-mono text-center text-2xl tracking-[0.4em] font-semibold py-2.5"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 text-center">
                Enter the 6-digit number from the email
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={otp.trim().length !== 6}
              className="w-full"
            >
              Verify &amp; Continue
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Didn't receive a code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1 text-[#0E7490] font-medium hover:text-[#155E75] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {resending ? (
                <>
                  <RefreshCw size={12} className="animate-spin" /> Sending...
                </>
              ) : cooldown > 0 ? (
                <>Resend in {cooldown}s</>
              ) : (
                <>Resend code</>
              )}
            </button>
          </div>
        </div>
      </div>

      {onBack && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
          >
            <ArrowLeft size={13} />
            <span>Use a different email address</span>
          </button>
        </div>
      )}
    </div>
  );
}

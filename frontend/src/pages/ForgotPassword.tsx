import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast.success('If an account exists, a reset link has been sent');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F1021 0%, #1A1D2E 50%, #0F1021 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(26, 29, 46, 0.9)',
        border: '1px solid #2E3354',
        borderRadius: '16px',
        padding: '2.5rem',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #A855F7, #6366F1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
          }}>
            Reset Password
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {sent
              ? "Check your email (or console) for the reset link"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#0F1021',
                  border: '1px solid #2E3354',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#A855F7')}
                onBlur={(e) => (e.target.style.borderColor = '#2E3354')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading
                  ? '#4a5568'
                  : 'linear-gradient(135deg, #A855F7, #6366F1)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}>
            <p style={{ color: '#c084fc', fontSize: '2rem', marginBottom: '0.5rem' }}>📧</p>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>
              If an account with <strong>{email}</strong> exists, you'll receive a reset link shortly.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              💡 Tip: If SMTP isn't configured, check the backend console for the reset URL
            </p>
          </div>
        )}

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #2E3354',
        }}>
          <Link
            to="/login"
            style={{
              color: '#A855F7',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

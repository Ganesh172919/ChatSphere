import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error('Invalid or missing reset link. Please request a new one.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email, token, newPassword);
      toast.success(result.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
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
          textAlign: 'center',
          color: '#e2e8f0',
          maxWidth: '400px',
        }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
          <h2 style={{ marginBottom: '0.5rem' }}>Invalid Reset Link</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            This reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            style={{
              color: '#A855F7',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Request New Reset Link →
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
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
            Set New Password
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Enter your new password for <strong style={{ color: '#c084fc' }}>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '0.85rem',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoFocus
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#A855F7')}
              onBlur={(e) => (e.target.style.borderColor = '#2E3354')}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: '0.85rem',
              marginBottom: '0.5rem',
              fontWeight: 500,
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              style={inputStyle}
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

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

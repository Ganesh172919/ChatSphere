import { useState } from 'react';
import { Mail, Lock, User, UserPlus, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [usernameError, setUsernameError] = useState('');

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(lower);
    if (lower.length > 0 && lower.length < 3) {
      setUsernameError('Username must be at least 3 characters');
    } else if (!/^[a-z0-9_]+$/.test(lower) && lower.length > 0) {
      setUsernameError('Only letters, numbers, and underscores');
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, username, password, displayName || undefined);
      toast.success('Account created successfully!');
      navigate('/', { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="auth-form">
      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label className="form-label">Username</label>
          <div className="input-wrapper">
            <UserPlus className="input-icon" size={18} />
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="input-field"
              placeholder="johndoe"
              required
              minLength={3}
              maxLength={30}
              pattern="^[a-z0-9_]+$"
              autoComplete="username"
            />
          </div>
          {usernameError && (
            <p className="text-xs text-danger mt-1">{usernameError}</p>
          )}
          <p className="text-xs text-text-muted mt-1">Only lowercase letters, numbers, and underscores</p>
        </div>

        <div className="form-group">
          <label className="form-label">Display Name <span className="text-text-muted">(optional)</span></label>
          <div className="input-wrapper">
            <User className="input-icon" size={18} />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="John Doe"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 8 characters"
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-text-muted mt-1">Must be at least 8 characters</p>
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="spinner mr-2" size={18} />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </div>
  );
}

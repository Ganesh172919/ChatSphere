import { MessageCircle } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <MessageCircle className="logo-icon" size={32} />
            <h1 className="logo-text">ChatSphere</h1>
          </div>
          <p className="auth-subtitle">Welcome back! Sign in to continue.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

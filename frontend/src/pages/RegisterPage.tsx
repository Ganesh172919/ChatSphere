import { MessageCircle } from 'lucide-react';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <MessageCircle className="logo-icon" size={32} />
            <h1 className="logo-text">ChatSphere</h1>
          </div>
          <p className="auth-subtitle">Create your account to get started.</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}

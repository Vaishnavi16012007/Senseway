import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(email);
    setIsSubmitting(false);

    if (res.success) {
      setMessage(res.message);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-page-container">
      <section className="auth-hero-pane" aria-label="SenseWay Overview">
        <div className="auth-hero-content">
          <div className="auth-brand-badge">
            <Sparkles size={16} />
            <span>ACCOUNT RECOVERY</span>
          </div>

          <h1 className="auth-hero-title">Reset Access.</h1>
          <div className="auth-hero-tagline">SECURE • DIRECT • ACCESSIBLE</div>

          <p className="auth-hero-desc">
            We will help you regain secure access to your SenseWay accessibility companion quickly.
          </p>
        </div>
      </section>

      <section className="auth-form-pane" aria-label="Password Reset Form">
        <div className="auth-card-box">
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--primary-purple)',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: '20px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>

          <h2 className="auth-header-title">Forgot Password?</h2>
          <p className="auth-header-subtitle">
            Enter your email and we'll send you recovery instructions.
          </p>

          {message ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: '#F0FDF4',
                border: '1px solid #86EFAC',
                color: '#15803D',
                fontSize: '0.92rem',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              role="status"
            >
              <CheckCircle2 size={20} />
              <span>{message}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#B91C1C',
                    fontSize: '0.9rem',
                    marginBottom: '20px',
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="recovery-email" className="form-label">
                  Email Address
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>SENDING LINK...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>SEND RECOVERY LINK</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default ForgotPassword;

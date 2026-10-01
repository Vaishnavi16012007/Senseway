import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const { speak } = useAccessibility();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessibilityNeed, setAccessibilityNeed] = useState('All-in-One Accessibility');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signup(name, email, password, accessibilityNeed);
      speak(`Welcome to SenseWay, ${name}. Your account has been created.`);
      navigate('/app');
    } catch {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* LEFT SIDE */}
      <section className="auth-hero-pane" aria-label="SenseWay Overview">
        <div className="auth-hero-content">
          <div className="auth-brand-badge">
            <Sparkles size={16} />
            <span>JOIN SENSEWAY</span>
          </div>

          <h1 className="auth-hero-title">Experience Freedom.</h1>
          <div className="auth-hero-tagline">SEE • HEAR • UNDERSTAND • NAVIGATE</div>

          <p className="auth-hero-desc">
            Personalize your companion to match your vision, hearing, and navigation preferences.
            Every interaction is designed with high contrast, voice feedback, and assistive intelligence.
          </p>
        </div>
      </section>

      {/* RIGHT SIDE FORM */}
      <section className="auth-form-pane" aria-label="Sign Up Form">
        <div className="auth-card-box">
          <h2 className="auth-header-title">Create Account</h2>
          <p className="auth-header-subtitle">Start your journey with SenseWay</p>

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

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="signup-name" className="form-label">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vaishnavi"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-need" className="form-label">
                Primary Accessibility Focus
              </label>
              <select
                id="signup-need"
                className="form-input"
                value={accessibilityNeed}
                onChange={(e) => setAccessibilityNeed(e.target.value)}
              >
                <option value="All-in-One Accessibility">All-in-One Companion (Vision + Voice + OCR)</option>
                <option value="Visual Assistance">Visual Assistance & Object Detection</option>
                <option value="Voice & Speech Navigation">Voice & Speech Navigation</option>
                <option value="Road & Transit Assistance">Road & Pedestrian Assistance</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: '10px', marginBottom: '20px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>CREATING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>CREATE ACCOUNT</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary-purple)', fontWeight: 700 }}>
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Signup;

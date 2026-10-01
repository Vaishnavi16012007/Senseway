import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import loginHeroImg from '../assets/login-hero.png';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { speak } = useAccessibility();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      speak('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      speak('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password, rememberMe);
      speak('Welcome to SenseWay. Your accessibility assistant is ready.');
      navigate('/app');
    } catch {
      setError('Sign in failed. Please verify your credentials.');
      speak('Sign in failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setEmail('vaishnavi@senseway.ai');
    setPassword('demo123456');
    setError('');
    setIsSubmitting(true);
    await login('vaishnavi@senseway.ai', 'demo123456', true);
    speak('Welcome back, Vaishnavi. SenseWay is online.');
    navigate('/app');
    setIsSubmitting(false);
  };

  return (
    <main className="senseway-auth-layout">
      {/* LEFT SECTION: 3D Accessibility Companion Illustration */}
      <section className="senseway-hero-pane" aria-label="SenseWay Accessibility Illustration">
        <div className="senseway-hero-media-wrap">
          <img
            src={loginHeroImg}
            alt="SenseWay: SEE • HEAR • UNDERSTAND • NAVIGATE — Your intelligent accessibility companion for a more independent and confident life."
            className="senseway-hero-image"
          />
        </div>

        {/* Semantic screen-reader content for accessibility */}
        <div className="sr-only">
          <h1>SenseWay</h1>
          <p>SEE • HEAR • UNDERSTAND • NAVIGATE</p>
          <p>
            Your intelligent accessibility companion for a more independent and confident life.
            Equipped with real-time Vision AI, Conversational Voice Assistant, Human-readable
            Location, Road Crossing Assistance, and Emergency SOS.
          </p>
        </div>
      </section>

      {/* RIGHT SECTION: Floating White Login Card */}
      <section className="senseway-card-pane" aria-label="Sign In Card">
        <div className="senseway-login-card">
          <header className="senseway-card-header">
            <h2 className="senseway-card-title">Welcome Back</h2>
            <p className="senseway-card-subtitle">Sign in to continue to SenseWay</p>
          </header>

          {error && (
            <div className="senseway-error-banner" role="alert">
              <AlertCircle size={18} className="senseway-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="senseway-auth-form">
            {/* Email Field */}
            <div className="senseway-form-group">
              <label htmlFor="login-email" className="senseway-field-label">
                Email Address
              </label>
              <div className="senseway-input-box">
                <Mail size={18} className="senseway-input-leading-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  className="senseway-text-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="username"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="senseway-form-group">
              <label htmlFor="login-password" className="senseway-field-label">
                Password
              </label>
              <div className="senseway-input-box">
                <Lock size={18} className="senseway-input-leading-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="senseway-text-input has-trailing-action"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  className="senseway-toggle-pw-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="senseway-options-row">
              <label className="senseway-checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="senseway-custom-checkbox"
                />
                <span className="senseway-checkbox-text">Remember me</span>
              </label>

              <Link to="/forgot-password" className="senseway-forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              className="senseway-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <ArrowRight size={19} className="senseway-btn-icon" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Quick Demo Access Chip */}
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="senseway-demo-btn"
              disabled={isSubmitting}
            >
              <Sparkles size={15} />
              <span>Explore with Demo Account</span>
            </button>

            {/* Bottom Create Account Link */}
            <div className="senseway-card-footer">
              <span className="senseway-footer-prompt">Don't have an account? </span>
              <Link to="/signup" className="senseway-signup-link">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Login;

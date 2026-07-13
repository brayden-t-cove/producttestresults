import { useEffect, useState } from 'react';
import LaserFlow from './LaserFlow.jsx';

const LOGO_URL = 'https://lh3.googleusercontent.com/d/1z-qNySTnx6Fo9EnmSf0WBsWSMF_P1mBP';

export default function LoginPage({ providers = {} }) {
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('auth_error');
    if (err === 'domain_not_allowed') {
      setAuthError('Your email domain is not yet authorized. Your sign-in attempt has been submitted for admin review.');
    } else if (err === 'provider_not_configured') {
      setAuthError('That sign-in provider is not yet configured. Please try another method.');
    }
    if (err) window.history.replaceState({}, '', '/');
  }, []);

  return (
    <div className="login-page">
      <LaserFlow
        color="#38a8f5"
        wispDensity={1}
        flowSpeed={0.35}
        verticalSizing={2}
        horizontalSizing={0.5}
        fogIntensity={0.45}
        fogScale={0.3}
        wispSpeed={15}
        wispIntensity={5}
        flowStrength={0.25}
        decay={1.1}
        horizontalBeamOffset={0}
        verticalBeamOffset={-0.5}
      />
      <div className="login-card">
        <div className="login-brand">
          {LOGO_URL && <img src={LOGO_URL} alt="Odyssey" className="login-brand-logo" />}
          <span className="login-brand-name">Odyssey</span>
          <span className="login-brand-tagline">Explore. Connect. Secure.</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in with your work account to continue.</p>

        {authError && (
          <div className="login-error">{authError}</div>
        )}

        <div className="login-buttons">
          {providers.google !== false && (
            <a href="/auth/google" className="login-btn login-btn-google">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </a>
          )}

          {providers.microsoft && (
            <a href="/auth/microsoft" className="login-btn login-btn-microsoft">
              <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </a>
          )}
        </div>

        <p className="login-footer">
          Access is restricted to authorized work domains. If your domain isn't recognized, your sign-in attempt will be submitted for admin review.
        </p>
      </div>
    </div>
  );
}

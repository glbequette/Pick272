import React, { useState, useEffect } from 'react';

export default function Auth({ onAuthSuccess }) {
  // Modes: 'login', 'register', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Check URL for a reset token on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setMode('reset');
      // Clean up the URL so the token doesn't sit in the address bar
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let endpoint = '';
      let payload = {};

      if (mode === 'login') {
        endpoint = '/api/auth/login';
        payload = { email, password };
      } else if (mode === 'register') {
        endpoint = '/api/auth/register';
        payload = { username, email, password };
      } else if (mode === 'forgot') {
        endpoint = '/api/auth/forgot-password';
        payload = { email };
      } else if (mode === 'reset') {
        endpoint = '/api/auth/reset-password';
        payload = { token: resetToken, newPassword: password };
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      // Handle Success Paths
      if (mode === 'login') {
        localStorage.setItem('nfl_picker_token', data.token);
        localStorage.setItem('nfl_picker_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
      } else if (mode === 'register') {
        setMessage({ type: 'success', text: data.message });
        setMode('login');
        setPassword('');
      } else if (mode === 'forgot') {
        setMessage({ type: 'success', text: data.message });
        setMode('login');
      } else if (mode === 'reset') {
        setMessage({ type: 'success', text: data.message });
        setMode('login');
        setPassword('');
        setResetToken(null);
      }

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', background: '#131c2e', padding: '32px', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '36px', color: '#f8fafc', margin: 0, letterSpacing: '1px' }}>
          {mode === 'login' ? 'WELCOME BACK' 
            : mode === 'register' ? 'CREATE ACCOUNT' 
            : mode === 'forgot' ? 'RESET PASSWORD' 
            : 'ENTER NEW PASSWORD'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          {mode === 'forgot' ? "Enter your email and we'll send a reset link." : "Lock in your 272 picks."}
        </p>
      </div>

      {message && (
        <div style={{ padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Username Field (Only for Register) */}
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none' }}
          />
        )}

        {/* Email Field (For Login, Register, and Forgot Password) */}
        {mode !== 'reset' && (
          <input
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none' }}
          />
        )}

        {/* Password Field (For Login, Register, and Reset) */}
        {mode !== 'forgot' && (
          <input
            type="password"
            placeholder={mode === 'reset' ? 'New Password' : 'Password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none' }}
          />
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#0b0f19', fontWeight: '800', fontFamily: 'Teko, sans-serif', fontSize: '20px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}
        >
          {loading ? 'PROCESSING...' : mode === 'login' ? 'SIGN IN' : mode === 'register' ? 'SIGN UP' : mode === 'forgot' ? 'SEND LINK' : 'RESET PASSWORD'}
        </button>
      </form>

      {/* Mode Toggles */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', fontSize: '13px' }}>
        
        {(mode === 'login' || mode === 'register') && (
          <div style={{ color: '#94a3b8' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null); }} 
              style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '700' }}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </span>
          </div>
        )}

        {mode === 'login' && (
          <div>
            <span 
              onClick={() => { setMode('forgot'); setMessage(null); }} 
              style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot your password?
            </span>
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div>
            <span 
              onClick={() => { setMode('login'); setMessage(null); }} 
              style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Back to Login
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
import React, { useState } from 'react';


export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : { username: formData.username, email: formData.email, password: formData.password };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      if (isLogin) {
        localStorage.setItem('nfl_picker_token', data.token);
        localStorage.setItem('nfl_picker_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
      } else {
        // Switch to login tab and display the email verification instruction
        setIsLogin(true);
        setError(data.message); // This will now display: "Registration successful! Please check your email..."
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>{isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</h2>
          <p style={styles.subtitle}>Lock in your 272 picks before Week 1 kickoff.</p>
        </div>

        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{ ...styles.tab, borderBottom: isLogin ? '2px solid #22c55e' : '2px solid transparent', color: isLogin ? '#22c55e' : '#94a3b8' }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{ ...styles.tab, borderBottom: !isLogin ? '2px solid #22c55e' : '2px solid transparent', color: !isLogin ? '#22c55e' : '#94a3b8' }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            ...styles.alert,
            background: error.includes('created') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderColor: error.includes('created') ? '#22c55e' : '#ef4444',
            color: error.includes('created') ? '#4ade80' : '#f87171'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div>
              <label style={styles.label}>USERNAME</label>
              <input
                type="text"
                name="username"
                required
                minLength={3}
                value={formData.username}
                onChange={handleChange}
                placeholder="GridironKing"
                style={styles.input}
              />
            </div>
          )}

          <div>
            <label style={styles.label}>EMAIL ADDRESS</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@domain.com"
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'AUTHENTICATING...' : isLogin ? 'SIGN IN' : 'REGISTER & START'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 16px'
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    background: '#131c2e',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontFamily: 'Teko, sans-serif',
    fontSize: '32px',
    letterSpacing: '1px',
    color: '#f8fafc',
    margin: 0
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    marginBottom: '24px'
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0b0f19',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#0b0f19',
    fontWeight: '800',
    fontFamily: 'Teko, sans-serif',
    fontSize: '20px',
    letterSpacing: '1px',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.35)',
    transition: 'transform 0.1s'
  }
};
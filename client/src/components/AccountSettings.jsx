import React, { useState } from 'react';

export default function AccountSettings({ user, setUser, onBack }) {
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/update/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          currentPassword, 
          newPassword 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update account.');
      }

      // Update local storage and app state with the new user info
      localStorage.setItem('nfl_picker_user', JSON.stringify(data.user));
      setUser(data.user);
      
      setMessage({ type: 'success', text: data.message });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
      
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#f8fafc', margin: 0, letterSpacing: '1px' }}>
            ACCOUNT SETTINGS
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manage your player profile and security.
          </p>
        </div>
        <button onClick={onBack} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' }}>
          BACK TO DASHBOARD
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '500px' }}>
        {message && (
          <div style={{ padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Profile Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em' }}>PROFILE</h3>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: '#1e293b', margin: '8px 0' }} />

          {/* Security Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em' }}>CHANGE PASSWORD (OPTIONAL)</h3>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#0b0f19', fontWeight: '800', fontFamily: 'Teko, sans-serif', fontSize: '20px', letterSpacing: '1px', cursor: 'pointer', marginTop: '12px' }}
          >
            {loading ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>
    </div>
  );
}
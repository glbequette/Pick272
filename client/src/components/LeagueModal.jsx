import React, { useState } from 'react';

export default function LeagueModal({ user, onClose, onLeagueSelected }) {
  const [activeTab, setActiveTab] = useState('join');
  const [inputValue, setInputValue] = useState('');
  
  // NEW: State for the nickname field
  const [nickname, setNickname] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const endpoint = activeTab === 'create' ? '/api/leagues/create' : '/api/leagues/join';
    
    // Add the nickname to the payload
    // Grab the rules and nickname for the payload
    const payload = activeTab === 'create' 
      ? { 
          name: inputValue, 
          userId: user.id, 
          nickname: nickname || user.username, // RESTORED: Send the nickname!
          pickMode: document.getElementById('pickModeSelect').value,
          pickVisibility: document.getElementById('pickVisibilitySelect').value 
        } 
      : { 
          inviteCode: inputValue, 
          userId: user.id,
          nickname: nickname || user.username // RESTORED: Send the nickname!
        };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setMessage({ type: 'success', text: data.message, code: data.league?.inviteCode });
      
      if (onLeagueSelected) onLeagueSelected(data.league._id);
      
      setInputValue('');
      setNickname('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>LEAGUE HUB</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setMessage(null); setInputValue(''); setNickname(''); }}
            style={{ ...styles.tab, borderBottom: activeTab === 'join' ? '2px solid #22c55e' : '2px solid transparent', color: activeTab === 'join' ? '#22c55e' : '#94a3b8' }}
          >
            JOIN LEAGUE
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setMessage(null); setInputValue(''); setNickname(''); }}
            style={{ ...styles.tab, borderBottom: activeTab === 'create' ? '2px solid #22c55e' : '2px solid transparent', color: activeTab === 'create' ? '#22c55e' : '#94a3b8' }}
          >
            CREATE LEAGUE
          </button>
        </div>

        {message && (
          <div style={{ ...styles.alert, background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
            {message.text}
            {message.type === 'success' && activeTab === 'create' && (
              <div style={styles.inviteBox}>
                Invite Code: <strong>{message.code}</strong>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>
              {activeTab === 'create' ? 'LEAGUE NAME' : '6-DIGIT INVITE CODE'}
            </label>
            <input
              type="text"
              required
              maxLength={activeTab === 'join' ? 6 : 30}
              value={inputValue}
              onChange={(e) => setInputValue(activeTab === 'join' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={activeTab === 'create' ? "e.g. Office Pool 2026" : "e.g. A1B2C3"}
              style={styles.input}
            />
          </div>

          {/* NEW NICKNAME FIELD */}
          <div>
            <label style={styles.label}>YOUR NICKNAME (OPTIONAL)</label>
            <input
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={`e.g. ${user?.username || 'GridironGuru'}`}
              style={styles.input}
            />
          </div>

          {activeTab === 'create' && (
          <>
            <div style={{ marginTop: '8px' }}>
              <label style={styles.label}>LEAGUE RULES</label>
              <select 
                id="pickModeSelect"
                style={{ ...styles.input, marginTop: '6px', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="season">Season Lock (All 272 picks)</option>
                <option value="weekly">Weekly Lock (Week-by-week picks)</option>
              </select>
            </div>

            {/* NEW: PICK VISIBILITY SELECTOR */}
            <div style={{ marginTop: '12px' }}>
              <label style={styles.label}>PICK VISIBILITY</label>
              <select 
                id="pickVisibilitySelect"
                style={{ ...styles.input, marginTop: '6px', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="hidden">Hidden Until Kickoff</option>
                <option value="open">Always Visible</option>
              </select>
            </div>
          </>
        )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'PROCESSING...' : activeTab === 'create' ? 'CREATE LEAGUE' : 'JOIN LEAGUE'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 25, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { width: '90%', maxWidth: '400px', background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontFamily: 'Teko, sans-serif', fontSize: '28px', color: '#f8fafc', margin: 0, letterSpacing: '1px' },
  closeBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' },
  tabContainer: { display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: '20px', gap: '8px' },
  tab: { flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#0b0f19', fontWeight: '800', fontFamily: 'Teko, sans-serif', fontSize: '20px', letterSpacing: '1px', cursor: 'pointer', marginTop: '8px' },
  alert: { padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' },
  inviteBox: { marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '16px', letterSpacing: '2px' }
};
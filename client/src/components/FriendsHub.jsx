import React, { useState, useEffect } from 'react';

export default function FriendsHub({ user, onBack }) {
  const [friendCode, setFriendCode] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [myFriendCode, setMyFriendCode] = useState('PENDING');
  const [message, setMessage] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [editNickname, setEditNickname] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch friends when the component mounts
  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setFriendsList(data.friendsList); // Grab the array
        setMyFriendCode(data.friendCode); // Grab your code straight from the DB!
      }
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('${API_BASE}/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          friendCode: friendCode.trim().toUpperCase() 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add friend.');
      }

      setMessage({ type: 'success', text: data.message });
      setFriendCode('');
      fetchFriends(); // Refresh the list instantly
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const res = await fetch('${API_BASE}/api/friends/nickname', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: selectedFriend._id, nickname: editNickname })
      });
      if (res.ok) {
        setSelectedFriend(null);
        fetchFriends();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm(`Are you sure you want to remove ${selectedFriend.username}?`)) return;
    setModalLoading(true);
    try {
      const res = await fetch('${API_BASE}/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: selectedFriend._id })
      });
      if (res.ok) {
        setSelectedFriend(null);
        fetchFriends();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
      
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#a855f7', margin: 0, letterSpacing: '1px' }}>
            FRIENDS HUB
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Add friends, compare pick sheets, and battle for bragging rights.
          </p>
        </div>
        <button onClick={onBack} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' }}>
          BACK TO DASHBOARD
        </button>
      </div>

      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        
        {/* Left Column: Add Friend & Your Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Your Code */}
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>YOUR FRIEND CODE</div>
            <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '36px', color: '#f8fafc', letterSpacing: '2px', lineHeight: 1 }}>
              {myFriendCode}
            </div>
          </div>

          {/* Add Friend Form */}
          <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#f8fafc' }}>Add a Friend</h3>
            {message && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', textAlign: 'center', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: message.type === 'success' ? '#4ade80' : '#f87171' }}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleAddFriend} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Enter 10-digit code"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#131c2e', color: '#f8fafc', fontSize: '16px', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px' }}
              />
              <button 
                type="submit" 
                disabled={loading || friendCode.length !== 10} 
                style={{ padding: '12px', borderRadius: '8px', border: 'none', background: friendCode.length === 10 ? '#a855f7' : '#374151', color: '#f8fafc', fontWeight: '700', fontSize: '14px', cursor: friendCode.length === 6 ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
              >
                {loading ? 'ADDING...' : 'SEND REQUEST'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Friends List */}
        <div style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', fontWeight: '800', letterSpacing: '0.1em' }}>MY FRIENDS</h3>
          
          {fetchLoading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Loading friends...</div>
          ) : friendsList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '20px' }}>Your Friends List is Empty</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, maxWidth: '250px' }}>
                Share your friend code or enter a buddy's code to start comparing picks.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {friendsList.map(friend => (
                <div 
                  key={friend._id} 
                  onClick={() => { setSelectedFriend(friend); setEditNickname(friend.nickname); }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#131c2e', border: '1px solid #1e293b', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#334155'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#1e293b'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '16px' }}>{friend.nickname}</span>
                    {friend.nickname !== friend.username && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>({friend.username})</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '1px' }}>{friend.friendCode}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FRIEND ACTION MODAL */}
      {selectedFriend && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 25, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '90%', maxWidth: '400px', background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '28px', color: '#f8fafc', margin: 0, letterSpacing: '1px' }}>MANAGE FRIEND</h2>
              <button onClick={() => setSelectedFriend(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateNickname} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px' }}>NICKNAME</label>
                <input
                  type="text"
                  maxLength={20}
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0b0f19', color: '#f8fafc', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" disabled={modalLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#38bdf8', color: '#0b0f19', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                {modalLoading ? 'SAVING...' : 'SAVE NICKNAME'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
              <button onClick={handleRemoveFriend} disabled={modalLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                REMOVE FRIEND
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
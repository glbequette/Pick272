import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('Invalid verification link.');
      return;
    }

    const verifyAccount = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/auth/verify/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('Account verified successfully! Redirecting to login...');
          setTimeout(() => navigate('/'), 3000); // Redirect to homepage after 3 seconds
        } else {
          setStatus(data.error || 'Verification failed. Token may be expired.');
        }
      } catch (err) {
        setStatus('Server error during verification.');
      }
    };

    verifyAccount();
  }, [token, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px', color: '#f8fafc', fontFamily: 'Teko, sans-serif', fontSize: '24px' }}>
      <h2>{status}</h2>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CXNavbar from '../components/CXNavbar';
import API from '../api/axios';

export default function CXHomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    API.get('auth/me/').then(res => setUser(res.data)).catch(console.error);
  }, []);

  const displayName = user?.first_name || user?.username || 'there';

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit' }}>
      <CXNavbar />
      
      <div style={{ maxWidth: 800, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: 48, color: '#111827', marginBottom: 20, letterSpacing: '-1px' }}>
          Hi {displayName}! 👋
        </h1>
        <p style={{ fontSize: 20, color: '#6B7280', marginBottom: 40, lineHeight: '1.5' }}>
          Ready for your next great look? Book top-rated barbers and stylists in Tashkent instantly.
        </p>
        
        <button 
          onClick={() => navigate('/search')}
          style={{ padding: '16px 32px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(244, 63, 94, 0.4)', transition: 'transform 0.2s, background 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#E11D48'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F43F5E'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Find barbers
        </button>
      </div>
    </div>
  );
}
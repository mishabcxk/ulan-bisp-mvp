import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function CXNavbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const token = localStorage.getItem('access_token'); 

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return; 
      try {
        const res = await API.get('auth/me/');
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user for navbar:", err);
      }
    };
    fetchUser();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login'; 
  };

  const displayAvatar = user?.first_name 
    ? user.first_name.charAt(0).toUpperCase() 
    : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');

  return (
    <header style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 40px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      
      {/* ALIGNMENT FIX: Centered content with line-height adjustments */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, height: '100%' }}>
        <Link to="/home" style={{ textDecoration: 'none', margin: 0, fontSize: 26, color: '#F43F5E', fontWeight: 'bold', letterSpacing: '-0.5px', lineHeight: '1' }}>
          Ulan
        </Link>
        <Link to="/search" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold', fontSize: 16, lineHeight: '1' }}>
          Find barbers
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {token && user ? (
          user.role === 'barber' ? (
            <>
              <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 'bold', marginRight: 10 }}>
                Logged in as Barber
              </span>
              <button onClick={() => navigate('/bx/dashboard')} style={{ padding: '8px 16px', background: '#111827', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
                Go to Dashboard
              </button>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/bookings" style={{ textDecoration: 'none', color: '#4B5563', fontWeight: 'bold', fontSize: 15 }}>
                My bookings
              </Link>
              
              {/* BEAUTIFUL SVG BELL ICON */}
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 5px', display: 'flex', alignItems: 'center', color: '#4B5563' }} title="Notifications">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </button>

              <div onClick={() => navigate('/profile')} style={{ width: 38, height: 38, background: '#E5E7EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#374151', fontSize: 16, cursor: 'pointer', border: '1px solid #D1D5DB' }}>
                {displayAvatar}
              </div>
            </>
          )
        ) : (
          <>
            <Link to="/login" style={{ textDecoration: 'none', color: '#4B5563', fontWeight: 'bold', fontSize: 15 }}>Log in</Link>
            <button onClick={() => navigate('/register')} style={{ padding: '8px 16px', background: '#111827', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
}
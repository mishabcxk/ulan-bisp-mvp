import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API from '../api/axios';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  
  // Smart Redirect: Checks if they were trying to book a specific barber before logging in
  const redirectUrl = searchParams.get('redirect') || '/home'; 

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await API.post('auth/login/', { username, password });
      
      // Store the JWT tokens
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);

      // We use window.location.href instead of navigate() here to force a hard reload.
      // This ensures the Navbar instantly recognizes the new token and fetches the user data!
      window.location.href = redirectUrl;
      
    } catch (err) {
      console.error(err);
      setError('Invalid username or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 20 }}>
      
      {/* Brand Logo */}
      <Link to="/" style={{ textDecoration: 'none', color: '#F43F5E', fontSize: 40, fontWeight: 'bold', letterSpacing: '-1px', marginBottom: 30 }}>
        Ulan
      </Link>

      {/* Login Card */}
      <div style={{ background: 'white', width: '100%', maxWidth: 400, padding: 40, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
        
        <h1 style={{ margin: '0 0 8px 0', fontSize: 24, color: '#111827', textAlign: 'center' }}>Welcome back</h1>
        <p style={{ margin: '0 0 30px 0', color: '#6B7280', fontSize: 15, textAlign: 'center' }}>Please enter your details to sign in.</p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>Username</label>
            <input 
              type="text" 
              required
              placeholder="Enter your username"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E', transition: 'border-color 0.2s' }} 
            />
          </div>

          <div style={{ marginBottom: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151' }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: 13, color: '#F43F5E', textDecoration: 'none', fontWeight: 'bold' }}>
              Forgot password?
              </Link>
            </div>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E', transition: 'border-color 0.2s' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ width: '100%', padding: '14px', background: isLoading ? '#FDA4AF' : '#111827', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#374151' }}
            onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#111827' }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', margin: '25px 0 0 0', fontSize: 14, color: '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#F43F5E', textDecoration: 'none', fontWeight: 'bold' }}>
            Sign up for free
          </Link>
        </p>

      </div>
    </div>
  );
}
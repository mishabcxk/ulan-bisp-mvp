import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CXNavbar from '../components/CXNavbar';
import API from '../api/axios';

export default function CXProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login'; 
  };

  const fetchUser = async () => {
    try {
      const res = await API.get('auth/me/');

      // SECURITY CHECK: Kick barbers out of the customer profile page!
      if (res.data.role === 'barber') {
        navigate('/bx/dashboard');
        return;
      }

      setUser(res.data);
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setEmail(res.data.email || '');
      setPhone(res.data.phone || '');
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await API.patch('auth/me/', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      });
      setMessage('Profile updated successfully!');
      fetchUser(); // Refresh the navbar avatar dynamically
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit' }}>
      <CXNavbar />
      
      <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ color: '#111827', fontSize: 32, marginBottom: 10 }}>Account Settings</h1>
        <p style={{ color: '#6B7280', marginBottom: 30 }}>Manage your personal information and contact details.</p>

        <div style={{ background: 'white', padding: 30, borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {message && (
            <div style={{ padding: 12, marginBottom: 20, borderRadius: 6, background: message.includes('success') ? '#ECFCCB' : '#FEE2E2', color: message.includes('success') ? '#4D7C0F' : '#EF4444', fontWeight: 'bold', textAlign: 'center' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, marginBottom: 30, background: '#F9FAFB', padding: 15, borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 12, color: '#6B7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Username</span>
              <strong style={{ fontSize: 16, color: '#111827' }}>{user?.username || '—'}</strong>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 12, color: '#6B7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Member Since</span>
              <strong style={{ fontSize: 16, color: '#111827' }}>
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 15 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#4B5563' }}>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, outlineColor: '#06B6D4' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#4B5563' }}>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, outlineColor: '#06B6D4' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#4B5563' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, outlineColor: '#06B6D4' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#4B5563' }}>Phone Number</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, outlineColor: '#06B6D4' }} />
            </div>

            <button type="submit" disabled={isSaving} style={{ padding: '14px', background: '#111827', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginTop: 10, fontSize: 16 }}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* NEW: Logout Button Section */}
          <div style={{ marginTop: 20 }}>
            <button 
              onClick={handleLogout} 
              style={{ width: '100%', padding: '14px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16, transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}
            >
              Log Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
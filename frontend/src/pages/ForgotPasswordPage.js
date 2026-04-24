import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

export default function ForgotPasswordPage() {
  // Step 1: Request OTP | Step 2: Verify OTP & Reset | Step 3: Success
  const [step, setStep] = useState(1); 
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await API.post('auth/password-reset-request/', { email });
      setStep(2); // Move to the verification step
    } catch (err) {
      setError('Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await API.post('auth/password-reset-confirm/', { 
        email, 
        code, 
        new_password: newPassword 
      });
      setStep(3); // Move to the success step!
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 20 }}>
      
      <Link to="/" style={{ textDecoration: 'none', color: '#F43F5E', fontSize: 40, fontWeight: 'bold', letterSpacing: '-1px', marginBottom: 30 }}>
        Ulan
      </Link>

      <div style={{ background: 'white', width: '100%', maxWidth: 400, padding: 40, borderRadius: 16, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
        
        {error && (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* --- STEP 1: REQUEST CODE --- */}
        {step === 1 && (
          <>
            <h1 style={{ margin: '0 0 8px 0', fontSize: 24, color: '#111827', textAlign: 'center' }}>Reset password</h1>
            <p style={{ margin: '0 0 30px 0', color: '#6B7280', fontSize: 15, textAlign: 'center' }}>Enter your email and we'll send you a 6-digit code.</p>

            <form onSubmit={handleRequestCode}>
              <div style={{ marginBottom: 25 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E' }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                style={{ width: '100%', padding: '14px', background: isLoading ? '#FDA4AF' : '#111827', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                {isLoading ? 'Sending code...' : 'Send reset code'}
              </button>
            </form>
          </>
        )}

        {/* --- STEP 2: VERIFY CODE & SET NEW PASSWORD --- */}
        {step === 2 && (
          <>
            <h1 style={{ margin: '0 0 8px 0', fontSize: 24, color: '#111827', textAlign: 'center' }}>Check your email</h1>
            <p style={{ margin: '0 0 30px 0', color: '#6B7280', fontSize: 15, textAlign: 'center' }}>We sent a 6-digit code to <strong>{email}</strong>.</p>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>6-Digit Code</label>
                <input 
                  type="text" 
                  required
                  placeholder="123456"
                  maxLength={6}
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E', textAlign: 'center', letterSpacing: 4, fontWeight: 'bold' }} 
                />
              </div>

              <div style={{ marginBottom: 25 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>New Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Enter a strong new password"
                  minLength={8}
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E' }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                style={{ width: '100%', padding: '14px', background: isLoading ? '#FDA4AF' : '#F43F5E', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                {isLoading ? 'Resetting...' : 'Securely Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* --- STEP 3: SUCCESS --- */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10B981' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: 24, color: '#111827' }}>Password Reset!</h1>
            <p style={{ margin: '0 0 30px 0', color: '#6B7280', fontSize: 15, lineHeight: '1.5' }}>Your password has been successfully changed. You can now log in with your new credentials.</p>
            
            <Link to="/login" style={{ display: 'block', width: '100%', padding: '14px', background: '#111827', color: 'white', textDecoration: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', boxSizing: 'border-box' }}>
              Return to login
            </Link>
          </div>
        )}

        {/* Back link for Step 1 & 2 */}
        {step !== 3 && (
          <div style={{ textAlign: 'center', marginTop: 25 }}>
            <Link to="/login" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none', fontWeight: 'bold' }}>
              ← Back to login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
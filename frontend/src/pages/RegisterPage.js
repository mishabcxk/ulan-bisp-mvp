import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios'; 

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const [step, setStep] = useState(1); 
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [formData, setFormData] = useState({
    role: 'customer',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '', 
    password: '',
    confirmPassword: '',
    legalName: '',
    taxId: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({}); 
  const [uniqueErrors, setUniqueErrors] = useState({}); // NEW: Tracks DB taken errors
  const [otp, setOtp] = useState('');

  // --- LOCAL VALIDATION EFFECT ---
  useEffect(() => {
    const newErrors = {};

    if (formData.firstName.length > 0 && formData.firstName.length < 2) newErrors.firstName = "First name is too short.";
    if (formData.lastName.length > 0 && formData.lastName.length < 2) newErrors.lastName = "Last name is too short.";
    
    // UPDATED: Telegram-style username (a-z, 0-9, underscore, min 5 chars)
    const usernameRegex = /^[a-z0-9_]{5,}$/;
    if (formData.username && !usernameRegex.test(formData.username)) {
      newErrors.username = "Must be 5+ chars (letters, numbers, or underscores).";
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Please enter a valid email address.";

    if (formData.phone && formData.phone.length < 14) {
      newErrors.phone = "Phone number is incomplete.";
    }

    // UPDATED: Password regex now explicitly includes the underscore _
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
    if (formData.password && !pwdRegex.test(formData.password)) {
      newErrors.password = "Needs 8+ chars, upper, lower, number, & symbol (incl. _).";
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (formData.role === 'barber') {
      if (touched.legalName && !formData.legalName) newErrors.legalName = "Legal entity name is required.";
      if (formData.taxId && formData.taxId.replace(/\D/g, '').length !== 9) newErrors.taxId = "Tax ID must be exactly 9 digits.";
    }

    setErrors(newErrors);
  }, [formData, touched]);


  // --- HANDLERS ---
  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Auto-lowercase the username just like Telegram
    if (name === 'username') {
      value = value.toLowerCase();
    }

    setFormData({ ...formData, [name]: value });
    
    if (touched[name]) setTouched({ ...touched, [name]: false });
    if (uniqueErrors[name]) setUniqueErrors({ ...uniqueErrors, [name]: null });
  };

  // --- THE DB SCOUT FUNCTION ---
  const checkUniqueness = async (field, value) => {
    try {
      const res = await API.get(`auth/check-unique/?field=${field}&value=${encodeURIComponent(value)}`);
      if (res.data.is_taken) {
        // Create a human-readable field name for the error message
        const displayNames = { username: "Username", email: "Email", phone: "Phone number", legalName: "Legal entity", taxId: "Tax ID" };
        setUniqueErrors(prev => ({ ...prev, [field]: `This ${displayNames[field]} is already registered.` }));
      }
    } catch (err) {
      console.error("Uniqueness check failed:", err);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });

    // Ping the backend on blur if they typed something long enough!
    if (['username', 'email', 'legalName', 'taxId'].includes(name) && value.length > 2 && !errors[name]) {
      checkUniqueness(name, value);
    }
    // Phone needs special formatting before checking
    if (name === 'phone' && value.length === 14 && !errors.phone) {
      const cleanPhone = `+998${value.replace(/\D/g, '')}`;
      checkUniqueness('phone', cleanPhone);
    }
  };

  const handlePhoneChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const cappedDigits = rawDigits.substring(0, 9);
    
    let formatted = cappedDigits;
    if (cappedDigits.length > 2) formatted = `(${cappedDigits.substring(0, 2)}) ${cappedDigits.substring(2)}`;
    if (cappedDigits.length > 5) formatted = `(${cappedDigits.substring(0, 2)}) ${cappedDigits.substring(2, 5)} ${cappedDigits.substring(5)}`;
    if (cappedDigits.length > 7) formatted = `(${cappedDigits.substring(0, 2)}) ${cappedDigits.substring(2, 5)} ${cappedDigits.substring(5, 7)} ${cappedDigits.substring(7)}`;

    setFormData({ ...formData, phone: formatted });
    if (touched.phone) setTouched({ ...touched, phone: false });
    if (uniqueErrors.phone) setUniqueErrors({ ...uniqueErrors, phone: null });
  };

  const handleTaxChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '').substring(0, 9);
    setFormData({ ...formData, taxId: rawDigits });
    if (touched.taxId) setTouched({ ...touched, taxId: false });
    if (uniqueErrors.taxId) setUniqueErrors({ ...uniqueErrors, taxId: null });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (Object.keys(errors).length > 0 || Object.keys(uniqueErrors).some(k => uniqueErrors[k]) || !formData.email || !formData.firstName) {
        setGlobalError("Please fix the errors in the form before submitting.");
        return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = `+998${formData.phone.replace(/\D/g, '')}`;
      // TRANSLATE React camelCase to Django snake_case
      const payload = { 
        role: formData.role,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: cleanPhone,
        first_name: formData.firstName,
        last_name: formData.lastName,
        legal_name: formData.legalName,
        tax_id: formData.taxId
      };

      await API.post('auth/register/', payload); 
      setStep(2); 
    } catch (err) {
      setGlobalError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setGlobalError('');

    try {
      await API.post('auth/verify-email/', { email: formData.email, code: otp });

      const user = await login(formData.username, formData.password);
      if (user.role === 'barber') navigate('/bx/dashboard');
      else navigate('/search');
      
    } catch (err) {
      setGlobalError("Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to cleanly grab either the local validation error OR the DB uniqueness error
  const getError = (fieldName) => {
    if (!touched[fieldName]) return null;
    if (uniqueErrors[fieldName]) return uniqueErrors[fieldName];
    return errors[fieldName];
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, width: '100%', maxWidth: 500, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        
        <h1 style={{ color: '#F43F5E', textAlign: 'center', margin: '0 0 10px 0', fontSize: 32, letterSpacing: '-0.5px' }}>Ulan</h1>
        
        {globalError && (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: 10, borderRadius: 6, marginBottom: 20, fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}>
            {globalError}
          </div>
        )}

        {step === 1 && (
          <>
            <h2 style={{ textAlign: 'center', color: '#111827', marginTop: 0, marginBottom: 30 }}>Create an Account</h2>
            
            <form onSubmit={handleRegisterSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              
              <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 10 }}>
                <button type="button" onClick={() => setFormData({...formData, role: 'customer'})} style={{ flex: 1, padding: 10, background: formData.role === 'customer' ? 'white' : 'transparent', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', boxShadow: formData.role === 'customer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: formData.role === 'customer' ? '#111827' : '#6B7280', transition: 'all 0.2s' }}>
                  I'm a Customer
                </button>
                <button type="button" onClick={() => setFormData({...formData, role: 'barber'})} style={{ flex: 1, padding: 10, background: formData.role === 'barber' ? 'white' : 'transparent', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', boxShadow: formData.role === 'barber' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: formData.role === 'barber' ? '#111827' : '#6B7280', transition: 'all 0.2s' }}>
                  I'm a Barber
                </button>
              </div>

              <div style={{ display: 'flex', gap: 15 }}>
                <div style={{ flex: 1 }}>
                  <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('firstName') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                  {getError('firstName') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('firstName')}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('lastName') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                  {getError('lastName') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('lastName')}</div>}
                </div>
              </div>

              <div>
                <input name="username" placeholder="Username" autoComplete="off" value={formData.username} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('username') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                {getError('username') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('username')}</div>}
              </div>

              <div>
                <input type="email" name="email" placeholder="Email Address" autoComplete="off" value={formData.email} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('email') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                {getError('email') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('email')}</div>}
              </div>

              {/* FIX: Removed explicit font sizes to match the other fields */}
              <div>
                <div style={{ display: 'flex', border: getError('phone') ? '1px solid #EF4444' : '1px solid #D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#F3F4F6', padding: '12px 15px', color: '#6B7280', fontWeight: 'bold', borderRight: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', fontFamily: 'inherit', fontSize: 12 }}>
                        +998
                    </div>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="(90) 123 45 67" 
                      value={formData.phone} 
                      onChange={handlePhoneChange} 
                      onBlur={handleBlur} 
                      style={{ flex: 1, padding: 12, border: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} 
                    />
                </div>
                {getError('phone') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('phone')}</div>}
              </div>

              <div style={{ display: 'flex', gap: 15 }}>
                <div style={{ flex: 1 }}>
                  <input type="password" name="password" placeholder="Password" autoComplete="new-password" value={formData.password} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('password') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                  {getError('password') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('password')}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="password" name="confirmPassword" placeholder="Confirm Password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('confirmPassword') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                  {getError('confirmPassword') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('confirmPassword')}</div>}
                </div>
              </div>

              {formData.role === 'barber' && (
                <div style={{ background: '#F9FAFB', padding: 20, borderRadius: 8, border: '1px solid #E5E7EB', marginTop: 10 }}>
                  <h3 style={{ fontSize: 15, marginTop: 0, color: '#374151', borderBottom: '1px solid #E5E7EB', paddingBottom: 10 }}>Barber Verification</h3>
                  <div style={{ marginBottom: 15, marginTop: 15 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#6B7280' }}>Legal Entity / Shop Name</label>
                    <input name="legalName" placeholder="e.g. Ulan Barbershop LLC" value={formData.legalName} onChange={handleChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('legalName') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                    {getError('legalName') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('legalName')}</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#6B7280' }}>Tax ID (INN)</label>
                    <input name="taxId" placeholder="9-digit number" value={formData.taxId} onChange={handleTaxChange} onBlur={handleBlur} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 6, border: getError('taxId') ? '1px solid #EF4444' : '1px solid #D1D5DB', outlineColor: '#06B6D4', fontFamily: 'inherit' }} />
                    {getError('taxId') && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{getError('taxId')}</div>}
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} style={{ width: '100%', padding: 14, background: '#111827', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginTop: 10, fontSize: 16, transition: 'background 0.2s', fontFamily: 'inherit' }}>
                {isLoading ? 'Processing...' : 'Create Account'}
              </button>
            </form>
            
            <p style={{ textAlign: 'center', color: '#6B7280', marginTop: 20, fontSize: 14 }}>
              Already have an account? <Link to="/login" style={{ color: '#F43F5E', textDecoration: 'none', fontWeight: 'bold' }}>Log in here</Link>
            </p>
          </>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#111827', marginTop: 0 }}>Check your email</h2>
            <p style={{ color: '#6B7280', marginBottom: 30 }}>We sent a 6-digit verification code to <strong style={{ color: '#111827' }}>{formData.email}</strong>. Please enter it below.</p>
            
            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input 
                type="text" 
                maxLength="6" 
                placeholder="000000" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                style={{ width: '100%', boxSizing: 'border-box', padding: 15, borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 32, textAlign: 'center', letterSpacing: 15, outlineColor: '#06B6D4', fontFamily: 'inherit' }} 
              />
              <button type="submit" disabled={isLoading || otp.length !== 6} style={{ width: '100%', padding: 14, background: '#06B6D4', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: otp.length === 6 ? 'pointer' : 'not-allowed', marginTop: 10, fontSize: 16, opacity: otp.length === 6 ? 1 : 0.7, fontFamily: 'inherit' }}>
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', marginTop: 25, fontSize: 14, fontWeight: 'bold', fontFamily: 'inherit' }}>
              ← Back to registration
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
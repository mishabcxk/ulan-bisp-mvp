import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios'; // We import your custom API client here!

export default function RegisterPage() {
  // We need a few more state variables for registration
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // Default to customer
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Send the data to Django to create the account
      await API.post('auth/register/', {
        username,
        email,
        password,
        role
      });

      // 2. If successful, automatically log them in using the AuthContext
      const user = await login(username, password);

      // 3. Redirect them to the correct dashboard based on their role
      if (user.role === 'barber') {
        navigate('/bx/dashboard');
      } else {
        navigate('/search');
      }
    } catch (err) {
      // If Django throws a 400 error (e.g., username already taken), we catch it here
      setError('Registration failed. Username or email might already be taken.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>Join Ulan</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <input
        placeholder="Username" 
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      
      <input
        type="email" 
        placeholder="Email" 
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      
      <input
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      
      {/* Dropdown for selecting the role */}
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      >
        <option value="customer">I am a Customer</option>
        <option value="barber">I am a Barber</option>
      </select>

      <button 
        onClick={handleSubmit}
        style={{ 
            width: '100%', padding: 12, background: '#06B6D4',
            color: 'white', border: 'none', cursor: 'pointer' 
        }}
      >
        Create Account
      </button>
    </div>
  );
}
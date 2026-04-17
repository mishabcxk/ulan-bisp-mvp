import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(username, password);
      if (user.role === 'barber') navigate('/bx/dashboard');
      else navigate('/search');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>Log In to Ulan</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        placeholder="Username" value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      <input
        type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
      />
      <button onClick={handleSubmit}
        style={{ width: '100%', padding: 12, background: '#06B6D4',
                 color: 'white', border: 'none', cursor: 'pointer' }}>
        Log In
      </button>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

// 1. The reusable BarberCard Component
const BarberCard = ({ barber }) => {
  const navigate = useNavigate();

  return (
    <div
    onClick={() => navigate(`/barbers/${barber.id}`)} 
    style={{ 
      border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, 
      background: 'white', display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#1F2937' }}>
            {barber.user?.username}
          </h3>
          <p style={{ margin: '4px 0 0', color: '#F59E0B', fontWeight: 'bold' }}>
            ★ {barber.average_rating ? barber.average_rating : 'New'}
          </p>
        </div>
        {/* Placeholder avatar */}
        <div style={{ width: 48, height: 48, background: '#E2E8F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          ✂️
        </div>
      </div>

      <p style={{ margin: 0, color: '#6B7280', fontSize: 14, minHeight: 40 }}>
        {barber.bio ? barber.bio.substring(0, 80) + '...' : 'No bio available yet.'}
      </p>

      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', color: '#9CA3AF' }}>
          Top Services
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {barber.services?.slice(0, 3).map(service => (
            <span key={service.id} style={{ 
              background: '#F3F4F6', padding: '4px 8px', 
              borderRadius: 4, fontSize: 12, color: '#374151' 
            }}>
              {service.name} - {service.price} UZS
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate(`/barbers/${barber.id}`)}
        style={{ 
          marginTop: 'auto', padding: '10px', background: '#06B6D4', 
          color: 'white', border: 'none', borderRadius: 6, 
          cursor: 'pointer', fontWeight: 'bold', width: '100%' 
        }}
      >
        Book Now
      </button>
    </div>
  );
};

// 2. The Main Search Page Component
export default function CXSearchPage() {
  const [barbers, setBarbers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // This effect runs whenever 'searchTerm' changes
  useEffect(() => {
    // Wait 500ms after the user stops typing before fetching
    const delayDebounceFn = setTimeout(() => {
      fetchBarbers(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchBarbers = async (query) => {
    try {
      setLoading(true);
      // If query exists, send ?service=query to Django
      const response = await API.get('barbers/', {
        params: query ? { service: query } : {}
      });
      setBarbers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load barbers. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 8, color: '#111827' }}>Find your perfect barber</h1>
      <p style={{ color: '#6B7280', marginBottom: 24 }}>Book appointments instantly with top-rated professionals.</p>

      {/* Search Input */}
      <div style={{ marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Search for a service (e.g., Haircut, Beard Trim)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '14px 16px', borderRadius: 8, 
            border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box'
          }}
        />
      </div>

      {/* States: Error, Loading, Empty, or Grid */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading barbers...</p>
      ) : barbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', background: 'white', borderRadius: 8, border: '1px dashed #D1D5DB' }}>
          <p style={{ color: '#6B7280', margin: 0 }}>No barbers found offering "{searchTerm}".</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 20 
        }}>
          {barbers.map(barber => (
            <BarberCard key={barber.id} barber={barber} />
          ))}
        </div>
      )}
    </div>
  );
}
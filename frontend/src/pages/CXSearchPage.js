import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import CXNavbar from '../components/CXNavbar';

const getExperienceBadge = (dateJoined) => {
  if (!dateJoined) return { text: 'New', icon: '⭐', color: '#F59E0B', bg: '#FEF3C7' }; 
  const months = (new Date() - new Date(dateJoined)) / (1000 * 60 * 60 * 24 * 30);
  if (months < 1) return { text: 'New', icon: '⭐', color: '#F59E0B', bg: '#FEF3C7' };
  if (months < 6) return { text: 'Fresh', icon: '🌿', color: '#10B981', bg: '#D1FAE5' };
  if (months < 24) return { text: 'Experienced', icon: '🔥', color: '#F97316', bg: '#FFEDD5' };
  return { text: 'Master', icon: '👑', color: '#8B5CF6', bg: '#EDE9FE' };
};

const BarberCard = ({ barber }) => {
  const navigate = useNavigate();
  const startingPrice = barber.services?.length > 0 ? Math.min(...barber.services.map(s => s.price)) : null;
  const exp = getExperienceBadge(barber.user?.date_joined);

  return (
    <div
      onClick={() => navigate(`/barbers/${barber.id}`)} 
      style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, background: 'white', display: 'flex', flexDirection: 'row', gap: 24, marginBottom: 20, transition: 'box-shadow 0.2s, border-color 0.2s', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
    >
      <div style={{ width: 140, height: 140, background: '#F3F4F6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0, border: '1px solid #E5E7EB' }}>
        {barber.profile_photo ? <img src={barber.profile_photo} alt="Barber" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : '✂️'}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#111827' }}>
            {barber.user?.first_name ? `${barber.user.first_name} ${barber.user.last_name}`.trim() : barber.user?.username}
          </h2>
          {barber.is_verified && <span style={{ background: '#ECFCCB', color: '#4D7C0F', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}>✓ Verified</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 12px 0' }}>
          <span style={{ color: exp.color, background: exp.bg, padding: '2px 8px', borderRadius: 6, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
            {exp.icon} {exp.text}
          </span>
          <span style={{ color: '#D1D5DB' }}>|</span>
          <strong style={{ fontSize: 15, color: '#111827' }}>★ {barber.average_rating ? barber.average_rating : 'New'}</strong>
          <span style={{ color: '#6B7280', fontSize: 14 }}>• {barber.reviews_count || 0} reviews</span>
        </div>

        <p style={{ margin: 0, color: '#4B5563', fontSize: 15, lineHeight: '1.5', flex: 1 }}>
          {barber.bio ? barber.bio.substring(0, 150) + '...' : 'Professional grooming services tailored to your style. Book a session to look your best!'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {barber.services?.slice(0, 3).map(service => (
            <span key={service.id} style={{ background: '#F3F4F6', padding: '6px 12px', borderRadius: 100, fontSize: 13, color: '#374151', fontWeight: '500' }}>{service.name}</span>
          ))}
          {barber.services?.length > 3 && <span style={{ padding: '6px 0', fontSize: 13, color: '#6B7280', fontWeight: '500' }}>+{barber.services.length - 3} more</span>}
        </div>
      </div>

      <div style={{ width: 220, borderLeft: '1px solid #E5E7EB', paddingLeft: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ textAlign: 'right', marginBottom: 30, marginTop: 10 }}>
          <span style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Starting from</span>
          <strong style={{ fontSize: 26, color: '#111827', letterSpacing: '-0.5px' }}>{startingPrice ? `${(startingPrice / 1000)}k UZS` : '—'}</strong>
          <span style={{ fontSize: 13, color: '#6B7280', display: 'block', marginTop: 4 }}>per session</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/barbers/${barber.id}`); }}
          style={{ width: '100%', padding: '14px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, transition: 'background 0.2s', marginTop: 'auto' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E11D48'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#F43F5E'}
        >
          View Profile
        </button>
      </div>
    </div>
  );
};

export default function CXSearchPage() {
  const [barbers, setBarbers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState(500000);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const BARBERS_PER_PAGE = 10;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowPriceDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBarbers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, maxPrice]);

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      const response = await API.get('barbers/', {
        params: { q: searchTerm, max_price: maxPrice === 500000 ? null : maxPrice }
      });
      setBarbers(response.data);
      setCurrentPage(1); // Reset pagination on new search
      setError('');
    } catch (err) {
      setError('Failed to load barbers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // PAGINATION LOGIC
  const indexOfLastBarber = currentPage * BARBERS_PER_PAGE;
  const indexOfFirstBarber = indexOfLastBarber - BARBERS_PER_PAGE;
  const currentBarbers = barbers.slice(indexOfFirstBarber, indexOfLastBarber);
  const totalPages = Math.ceil(barbers.length / BARBERS_PER_PAGE);

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit' }}>
      <CXNavbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: 32 }}>Top-rated professionals</h1>
        <p style={{ color: '#6B7280', margin: '0 0 30px 0', fontSize: 16 }}>Book appointments instantly with Tashkent's finest.</p>

        <div style={{ display: 'flex', gap: 15, marginBottom: 40, flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 400px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' }}>I want to book</label>
            <input type="text" placeholder="Search by service, barber name, or style..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', outlineColor: '#F43F5E' }} />
          </div>
          
          <div style={{ flex: '1 1 250px', position: 'relative' }} ref={dropdownRef}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' }}>Max Price per session</label>
            <div onClick={() => setShowPriceDropdown(!showPriceDropdown)} style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: showPriceDropdown ? '1px solid #F43F5E' : '1px solid #D1D5DB', fontSize: 16, boxSizing: 'border-box', background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#111827' }}>Up to {maxPrice === 500000 ? 'Any Price' : `${maxPrice / 1000}k UZS`}</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>▼</span>
            </div>

            {showPriceDropdown && (
              <div style={{ position: 'absolute', top: 85, left: 0, right: 0, background: 'white', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: 12, border: '1px solid #E5E7EB', zIndex: 10 }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: 24, textAlign: 'center', color: '#111827' }}>{maxPrice === 500000 ? 'Any Price' : `Up to ${maxPrice / 1000}k UZS`}</h4>
                <input type="range" min="30000" max="500000" step="10000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#F43F5E' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 14, color: '#6B7280', fontWeight: 'bold' }}>
                  <span>30k</span><span>500k+</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TEXT UPDATE HERE */}
        <h3 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: 20 }}>
          {barbers.length} {barbers.length === 1 ? 'barber' : 'barbers'} that match your needs
        </h3>

        {error && <div style={{ background: '#FEE2E2', color: '#EF4444', padding: 15, borderRadius: 8, marginBottom: 20 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}><p style={{ color: '#6B7280', fontSize: 18 }}>Searching for professionals...</p></div>
        ) : barbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 12, border: '1px dashed #D1D5DB' }}>
            <p style={{ color: '#4B5563', fontSize: 18, margin: '0 0 10px 0', fontWeight: 'bold' }}>No matches found</p>
            <p style={{ color: '#6B7280', margin: 0 }}>Try adjusting your search terms or increasing the price filter.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {currentBarbers.map(barber => (
                <BarberCard key={barber.id} barber={barber} />
              ))}
            </div>

            {/* NEW PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 40 }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: currentPage === 1 ? '#F9FAFB' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: currentPage === 1 ? '#9CA3AF' : '#111827' }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#4B5563' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: currentPage === totalPages ? '#F9FAFB' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: currentPage === totalPages ? '#9CA3AF' : '#111827' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
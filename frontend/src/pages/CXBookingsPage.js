import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CXNavbar from '../components/CXNavbar';
import API from '../api/axios';

export default function CXBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await API.get('my/customer-bookings/');
        setBookings(res.data);
      } catch (err) {
        console.error("Failed to fetch bookings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit' }}>
      <CXNavbar />
      
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 30 }}>
          <div>
            <h1 style={{ color: '#111827', fontSize: 32, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>My Bookings</h1>
            <p style={{ color: '#6B7280', margin: 0 }}>View and manage your upcoming and past appointments.</p>
          </div>
          <button 
            onClick={() => navigate('/search')}
            style={{ padding: '10px 20px', background: 'white', color: '#111827', border: '1px solid #D1D5DB', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
          >
            Book new session
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280', marginTop: 40 }}>Loading your itinerary...</p>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', background: 'white', padding: 60, borderRadius: 12, border: '1px dashed #D1D5DB' }}>
            <div style={{ fontSize: 40, marginBottom: 15 }}>🗓️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#111827' }}>No bookings yet</h3>
            <p style={{ color: '#6B7280', margin: '0 0 20px 0' }}>You haven't scheduled any appointments.</p>
            <button onClick={() => navigate('/search')} style={{ padding: '12px 24px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
              Find a professional
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {bookings.map(booking => {
              
              // 1. Read the new fields directly from Django!
              const barberName = booking.barber_name || 'Your Barber';
              const barberId = booking.barber_id;

              return (
                <div key={booking.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ background: booking.status === 'completed' ? '#F3F4F6' : '#ECFCCB', color: booking.status === 'completed' ? '#6B7280' : '#4D7C0F', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {booking.status}
                      </span>
                      <strong style={{ fontSize: 18, color: '#111827' }}>{booking.service?.name}</strong>
                    </div>
                    
                    <p style={{ margin: '0 0 5px 0', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                      <span title="Barber">✂️</span> 
                      
                      {/* 2. The Clickable Link */}
                      {barberId ? (
                        <span 
                          onClick={() => navigate(`/barbers/${barberId}`)}
                          style={{ color: '#F43F5E', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {barberName}
                        </span>
                      ) : (
                        barberName
                      )}
                    </p>
                    
                    <p style={{ margin: 0, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <span title="Time">🕒</span> {booking.time_slot?.date} at {booking.time_slot?.start_time?.substring(0, 5)}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: 20, color: '#111827', display: 'block', marginBottom: 10 }}>
                      {booking.service?.price ? `${(booking.service.price / 1000)}k UZS` : '—'}
                    </strong>
                    {booking.status === 'completed' && !booking.has_review && (
                      <button 
                        style={{ padding: '8px 16px', background: 'white', color: '#F43F5E', border: '1px solid #F43F5E', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', fontSize: 13, transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FFF1F2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        Leave Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
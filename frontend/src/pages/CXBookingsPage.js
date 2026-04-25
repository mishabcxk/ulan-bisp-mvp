import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CXNavbar from '../components/CXNavbar';
import API from '../api/axios';

export default function CXBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
  }, []); // <--- useEffect ends correctly here!

  // The submit function is now safely OUTSIDE the useEffect
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      await API.post('reviews/', {
        booking: reviewModalBooking.id,
        rating: rating,
        comment: comment
      });
      
      setBookings(bookings.map(b => b.id === reviewModalBooking.id ? { ...b, has_review: true } : b));
      
      setReviewModalBooking(null);
      setRating(5);
      setComment('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
              
              const barberName = booking.barber_name || 'Your Barber';
              const barberId = booking.barber_id;

              // 1. Dynamic styling for the status badge
              let badgeBg = '#ECFCCB'; // Default Green (confirmed)
              let badgeColor = '#4D7C0F';
              if (booking.status === 'completed') {
                  badgeBg = '#F3F4F6'; // Gray
                  badgeColor = '#6B7280';
              } else if (booking.status === 'no_show') {
                  badgeBg = '#FEE2E2'; // Red
                  badgeColor = '#EF4444';
              }

              return (
                <div key={booking.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {booking.status.replace('_', '-')}
                      </span>
                      <strong style={{ fontSize: 18, color: '#111827' }}>{booking.service?.name}</strong>
                    </div>
                    
                    <p style={{ margin: '0 0 5px 0', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                      <span title="Barber">✂️</span> 
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
                    {/* 2. The button ONLY appears if status is strictly 'completed' */}
                    {booking.status === 'completed' && !booking.has_review && (
                      <button 
                        onClick={() => setReviewModalBooking(booking)}
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

      {/* ==========================================
          BEAUTIFUL REVIEW MODAL
          ========================================== */}
      {reviewModalBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            <h2 style={{ margin: '0 0 5px 0', fontSize: 24, color: '#111827' }}>Rate your experience</h2>
            <p style={{ color: '#6B7280', margin: '0 0 25px 0', fontSize: 15 }}>
              How was your <strong>{reviewModalBooking.service?.name}</strong> with {reviewModalBooking.barber_name || 'your barber'}?
            </p>

            <form onSubmit={handleSubmitReview}>
              
              <div style={{ display: 'flex', gap: 8, marginBottom: 25, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg 
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    width="40" height="40" viewBox="0 0 24 24" 
                    fill={star <= rating ? "#F59E0B" : "none"} 
                    stroke={star <= rating ? "#F59E0B" : "#D1D5DB"} 
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ cursor: 'pointer', transition: 'all 0.1s' }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                ))}
              </div>

              <div style={{ marginBottom: 25 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>Share more about your experience (optional)</label>
                <textarea 
                  placeholder="The fade was incredibly clean, and the shop had a great vibe..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, fontFamily: 'inherit', minHeight: 100, boxSizing: 'border-box', outlineColor: '#F43F5E' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setReviewModalBooking(null)} 
                  style={{ flex: 1, padding: '14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingReview}
                  style={{ flex: 1, padding: '14px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: isSubmittingReview ? 'not-allowed' : 'pointer', fontSize: 16 }}
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
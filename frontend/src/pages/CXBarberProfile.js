import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import CXNavbar from '../components/CXNavbar';

// Helper for dynamic Experience Badge
const getExperienceBadge = (dateJoined) => {
  if (!dateJoined) return { text: 'New', icon: '⭐', color: '#F59E0B', bg: '#FEF3C7' }; 
  const months = (new Date() - new Date(dateJoined)) / (1000 * 60 * 60 * 24 * 30);
  if (months < 1) return { text: 'New', icon: '⭐', color: '#F59E0B', bg: '#FEF3C7' };
  if (months < 6) return { text: 'Fresh', icon: '🌿', color: '#10B981', bg: '#D1FAE5' };
  if (months < 24) return { text: 'Experienced', icon: '🔥', color: '#F97316', bg: '#FFEDD5' };
  return { text: 'Master', icon: '👑', color: '#8B5CF6', bg: '#EDE9FE' };
};

export default function CXBarberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [barber, setBarber] = useState(null);
  const [slots, setSlots] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // NEW: Week Offset State (0 = this week, 1 = next week, etc.)
  const [weekOffset, setWeekOffset] = useState(0);

  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NEW: Dynamic 7 Days Generator based on arrow clicks
  const next7Days = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (weekOffset * 7) + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekOffset]);

  useEffect(() => {
    const fetchBarberData = async () => {
      try {
        setLoading(true);
        const [profileRes, slotsRes, reviewsRes] = await Promise.all([
          API.get(`barbers/${id}/`),
          API.get(`barbers/${id}/slots/`),
          API.get(`barbers/${id}/reviews/`)
        ]);
        setBarber(profileRes.data);
        setSlots(slotsRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        console.error(err);
        setError('Could not load barber profile. They might not exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchBarberData();
  }, [id]);

  const handleNextPhoto = useCallback(() => {
    if (!barber?.photos) return;
    setActivePhotoIndex((prev) => (prev + 1) % barber.photos.length);
  }, [barber]);

  const handlePrevPhoto = useCallback(() => {
    if (!barber?.photos) return;
    setActivePhotoIndex((prev) => (prev - 1 + barber.photos.length) % barber.photos.length);
  }, [barber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePhotoIndex === null || !barber?.photos) return;
      if (e.key === 'Escape') setActivePhotoIndex(null);
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, barber, handleNextPhoto, handlePrevPhoto]);

  const handleSlotClick = (slot) => {
    if (selectedSlot?.id === slot.id) {
      setSelectedSlot(null);
      return;
    }
    if (!selectedService) {
      alert("Please select a service before picking a time!");
      return;
    }
    setSelectedSlot(slot); 
  };

  const handleProceedToCheckout = () => {
    const token = localStorage.getItem('access_token'); 
    if (!token) {
      alert("Please log in or create an account to secure this booking.");
      navigate(`/login?redirect=/barbers/${id}`);
      return;
    }
    navigate(`/checkout?slotId=${selectedSlot.id}&serviceId=${selectedService.id}`, {
      state: { slot: selectedSlot, service: selectedService, barber: barber }
    });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading profile...</div>;
  if (error) return <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>{error}</div>;
  if (!barber) return null;

  const startingPrice = barber.services?.length > 0 ? Math.min(...barber.services.map(s => s.price)) : null;
  const displayPrice = selectedService ? selectedService.price : startingPrice;
  const exp = getExperienceBadge(barber.date_joined || barber.user?.date_joined);

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit', paddingBottom: 60 }}>
      <CXNavbar />
      
      <div style={{ padding: '20px 40px 0 40px', maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to search results
        </button>
      </div>
      
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px', display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>
          
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
              <h1 style={{ margin: 0, fontSize: 36, color: '#111827', letterSpacing: '-0.5px' }}>
                {barber.user?.first_name ? `${barber.user.first_name} ${barber.user.last_name}`.trim() : barber.user?.username}
              </h1>
              {barber.is_verified && (
                <span style={{ background: '#ECFCCB', color: '#4D7C0F', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ Verified
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
              <span style={{ color: exp.color, background: exp.bg, padding: '4px 10px', borderRadius: 6, fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                {exp.icon} {exp.text}
              </span>
              {barber.address && (
                <>
                  <span style={{ color: '#D1D5DB' }}>|</span>
                  <span style={{ color: '#6B7280', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    📍 {barber.address}
                  </span>
                </>
              )}
            </div>

            <h2 style={{ fontSize: 20, color: '#111827', marginTop: 30, marginBottom: 10 }}>About me</h2>
            <p style={{ color: '#4B5563', fontSize: 16, lineHeight: '1.6', margin: 0 }}>
              {barber.bio || 'Professional grooming services tailored to your style. I look forward to working with you!'}
            </p>
          </div>

          {barber.photos && barber.photos.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, color: '#111827', marginBottom: 15 }}>Portfolio</h2>
              <div style={{ display: 'flex', gap: 15, overflowX: 'auto', paddingBottom: 10 }}>
                {barber.photos.map((photo, index) => (
                  <img 
                    key={photo.id} src={photo.image} alt={`Portfolio ${index + 1}`} onClick={() => setActivePhotoIndex(index)} 
                    style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 12, cursor: 'pointer', border: '1px solid #E5E7EB', transition: 'transform 0.2s' }} 
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, color: '#111827', marginBottom: 15 }}>1. Select a Service</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {barber.services?.map(service => (
                <div 
                  key={service.id}
                  onClick={() => {
                    if (selectedService?.id === service.id) {
                      setSelectedService(null);
                      setSelectedSlot(null); 
                    } else {
                      setSelectedService(service);
                    }
                  }}
                  style={{
                    padding: '20px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                    border: selectedService?.id === service.id ? '2px solid #111827' : '1px solid #E5E7EB',
                    background: selectedService?.id === service.id ? '#F9FAFB' : 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: 18, color: '#111827', marginBottom: 4 }}>{service.name}</strong>
                    <span style={{ color: '#6B7280', fontSize: 14 }}>{service.duration_minutes} mins</span>
                  </div>
                  <strong style={{ fontSize: 18, color: '#111827' }}>{(service.price / 1000)}k UZS</strong>
                </div>
              ))}
            </div>
          </div>

          {/* SCHEDULE GRID WITH ARROWS */}
          <div style={{ marginBottom: 40 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 }}>
              <div>
                <h2 style={{ fontSize: 20, color: '#111827', margin: '0 0 5px 0' }}>2. Select a Time</h2>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
                  {selectedService ? 'Choose an available slot below.' : 'Please select a service above first.'}
                </p>
              </div>

              {/* ARROWS NAVIGATION */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                  style={{ 
                    padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB', 
                    background: weekOffset === 0 ? '#F9FAFB' : 'white', 
                    color: weekOffset === 0 ? '#9CA3AF' : '#111827', 
                    cursor: weekOffset === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
                  }}
                >
                  ❮
                </button>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#111827', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ❯
                </button>
              </div>
            </div>
            
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: 'white', overflow: 'hidden' }}>
              <div style={{ display: 'flex', overflowX: 'auto' }}>
                {next7Days.map((date, index) => {
                  const daySlots = slots
                    .filter(slot => slot.date === date)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const dateObj = new Date(date);
                  
                  return (
                    <div key={date} style={{ flex: '1 1 0', minWidth: 80, borderRight: index === 6 ? 'none' : '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '15px 5px', textAlign: 'center', borderBottom: '2px solid #F43F5E', background: '#F9FAFB' }}>
                        <div style={{ color: '#6B7280', fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' }}>
                          {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div style={{ color: '#111827', fontSize: 18, fontWeight: 'bold', marginTop: 2 }}>
                          {dateObj.getDate()}
                        </div>
                      </div>
                      
                      <div style={{ padding: '15px 10px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minHeight: 120 }}>
                        {daySlots.length > 0 ? (
                          daySlots.map(slot => (
                            <button
                              key={slot.id} onClick={() => handleSlotClick(slot)}
                              style={{
                                width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14, transition: 'all 0.2s',
                                background: selectedSlot?.id === slot.id ? '#111827' : 'white',
                                color: selectedSlot?.id === slot.id ? 'white' : '#374151',
                                border: selectedSlot?.id === slot.id ? '1px solid #111827' : '1px solid #D1D5DB',
                                opacity: !selectedService && selectedSlot?.id !== slot.id ? 0.5 : 1
                              }}
                            >
                              {slot.start_time.substring(0, 5)}
                            </button>
                          ))
                        ) : (
                          <span style={{ color: '#D1D5DB', fontSize: 24 }}>-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* REVIEWS SECTION */}
          <div style={{ marginBottom: 60, marginTop: 20 }}>
            <h2 style={{ fontSize: 20, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              Reviews <span style={{ color: '#6B7280', fontSize: 16, fontWeight: 'normal' }}>({reviews.length})</span>
            </h2>

            {reviews.length === 0 ? (
              <div style={{ background: '#F9FAFB', padding: 30, borderRadius: 12, border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                <p style={{ color: '#6B7280', margin: 0, fontSize: 15 }}>No reviews yet. Be the first to book and leave feedback!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map(review => (
                  <div key={review.id} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 20 }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, background: '#F3F4F6', color: '#4B5563', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, border: '1px solid #D1D5DB' }}>
                          {review.customer_name ? review.customer_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <strong style={{ display: 'block', color: '#111827', fontSize: 15 }}>{review.customer_name || 'Verified Customer'}</strong>
                          {/* REAL DATE RENDERED HERE: Supports 'created_at' or 'date_created' from backend */}
                          <span style={{ color: '#6B7280', fontSize: 13 }}>
                            {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (review.date_created || 'Recently')}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill={star <= review.rating ? "#F59E0B" : "#E5E7EB"} stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p style={{ margin: '10px 0 0 0', color: '#4B5563', fontSize: 15, lineHeight: '1.5' }}>
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Sidebar */}
        <div style={{ flex: '0 0 340px', width: '100%', position: 'sticky', top: 100, alignSelf: 'flex-start' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 30, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', letterSpacing: '-1px' }}>
                {displayPrice ? `${(displayPrice / 1000)}k` : '—'} UZS
              </span>
              <span style={{ color: '#6B7280', fontSize: 15 }}>
                {selectedService ? selectedService.name : (startingPrice ? 'starting price' : '')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                  <span style={{ color: '#111827' }}>★</span> {barber.average_rating ? barber.average_rating : 'New'}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{barber.reviews_count || 0} reviews</div>
              </div>
            </div>

            {selectedService && selectedSlot && (
              <div style={{ background: '#F9FAFB', padding: 15, borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#6B7280' }}>Date:</span>
                  <strong style={{ color: '#111827' }}>{selectedSlot.date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ color: '#6B7280' }}>Time:</span>
                  <strong style={{ color: '#111827' }}>{selectedSlot.start_time.substring(0, 5)}</strong>
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToCheckout} disabled={!selectedService || !selectedSlot}
              style={{
                width: '100%', padding: '16px', background: (!selectedService || !selectedSlot) ? '#FCA5A5' : '#F43F5E', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 'bold',
                cursor: (!selectedService || !selectedSlot) ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { if (selectedService && selectedSlot) e.currentTarget.style.background = '#E11D48'; }}
              onMouseLeave={(e) => { if (selectedService && selectedSlot) e.currentTarget.style.background = '#F43F5E'; }}
            >
              Book appointment
            </button>

            {(!selectedService || !selectedSlot) && (
              <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 15, margin: '15px 0 0 0' }}>
                Select a service and time to continue
              </p>
            )}
          </div>
        </div>

      </div>

      {activePhotoIndex !== null && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}
          onClick={(e) => { if(e.target === e.currentTarget) setActivePhotoIndex(null); }}
        >
          <button onClick={() => setActivePhotoIndex(null)} style={{ position: 'absolute', top: 20, right: 30, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 40, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
            ×
          </button>
          {barber.photos.length > 1 && (
            <button onClick={handlePrevPhoto} style={{ position: 'absolute', left: 40, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 50, cursor: 'pointer', padding: 20, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
              ❮
            </button>
          )}
          <img src={barber.photos[activePhotoIndex].image} alt="Portfolio Fullscreen" style={{ maxHeight: '80vh', maxWidth: '80vw', objectFit: 'contain', borderRadius: 4 }} />
          <p style={{ color: '#D1D5DB', marginTop: 20, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>
            {activePhotoIndex + 1} OF {barber.photos.length}
          </p>
          {barber.photos.length > 1 && (
            <button onClick={handleNextPhoto} style={{ position: 'absolute', right: 40, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 50, cursor: 'pointer', padding: 20, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
              ❯
            </button>
          )}
        </div>
      )}
    </div>
  );
}
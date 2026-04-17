import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

// Helper function to generate the next 7 days
const generateNext7Days = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};
const next7Days = generateNext7Days();

export default function CXBarberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data State
  const [barber, setBarber] = useState(null);
  const [slots, setSlots] = useState([]);

  // Selection State
  const [selectedDate, setSelectedDate] = useState(next7Days[0]); 
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // NEW: Lightbox Gallery State
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBarberData = async () => {
      try {
        setLoading(true);
        const [profileRes, slotsRes] = await Promise.all([
          API.get(`barbers/${id}/`),
          API.get(`barbers/${id}/slots/`)
        ]);
        
        setBarber(profileRes.data);
        setSlots(slotsRes.data);
      } catch (err) {
        console.error(err);
        setError('Could not load barber profile. They might not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarberData();
  }, [id]);

  // Lightbox Navigation Functions (Memorized!)
  const handleNextPhoto = useCallback(() => {
    if (!barber?.photos) return;
    setActivePhotoIndex((prev) => (prev + 1) % barber.photos.length);
  }, [barber]);

  const handlePrevPhoto = useCallback(() => {
    if (!barber?.photos) return;
    setActivePhotoIndex((prev) => (prev - 1 + barber.photos.length) % barber.photos.length);
  }, [barber]);

  // NEW: Keyboard Event Listener for the Lightbox Gallery
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePhotoIndex === null || !barber?.photos) return;
      
      if (e.key === 'Escape') setActivePhotoIndex(null);
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'ArrowLeft') handlePrevPhoto();
    };

    // Attach the listener to the whole window
    window.addEventListener('keydown', handleKeyDown);
    // Cleanup function when the component unmounts or updates
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, barber, handleNextPhoto, handlePrevPhoto]);

  const availableSlotsForDate = slots.filter(slot => slot.date === selectedDate);

  const handleSlotClick = (slot) => {
    // If they click the slot they already selected, deselect it!
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
    navigate(`/checkout?slotId=${selectedSlot.id}&serviceId=${selectedService.id}`);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading profile...</div>;
  if (error) return <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>{error}</div>;
  if (!barber) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* 1. TOP: Profile Header & Bio */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: 20, marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 10px' }}>{barber.user?.username}</h1>
        <p style={{ color: '#F59E0B', fontWeight: 'bold', margin: '0 0 10px' }}>
          ★ {barber.average_rating ? barber.average_rating : 'New Barber'}
        </p>
        <p style={{ color: '#4B5563' }}>{barber.bio || 'This barber has not written a bio yet.'}</p>
        {barber.latitude && barber.longitude && (
          <p style={{ margin: '10px 0 0', fontSize: 14 }}>
            📍 <a 
                 href={`https://www.google.com/maps/search/?api=1&query=${barber.latitude},${barber.longitude}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 style={{ color: '#06B6D4', textDecoration: 'none', fontWeight: 'bold' }}
               >
                 View Location on Map
               </a>
          </p>
        )}
        
        {/* Portfolio Photos (Updated to be clickable) */}
        {barber.photos && barber.photos.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginTop: 15, paddingBottom: 10 }}>
            {barber.photos.map((photo, index) => (
              <img 
                key={photo.id} 
                src={photo.image} 
                alt={photo.caption}
                onClick={() => setActivePhotoIndex(index)} // Trigger lightbox
                style={{ 
                  width: 120, height: 120, objectFit: 'cover', 
                  borderRadius: 8, cursor: 'pointer',
                  border: '1px solid #E5E7EB'
                }} 
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. MIDDLE: Service Selection */}
      <div style={{ marginBottom: 30 }}>
        <h2>1. Select a Service</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {barber.services?.map(service => (
            <div 
              key={service.id}
              onClick={() => {
                if (selectedService?.id === service.id) {
                  setSelectedService(null);
                  setSelectedSlot(null); // Clear the slot if they uncheck the service
                } else {
                  setSelectedService(service);
                }
              }}
              style={{
                padding: 15, borderRadius: 8, cursor: 'pointer',
                border: selectedService?.id === service.id ? '2px solid #06B6D4' : '1px solid #E5E7EB',
                background: selectedService?.id === service.id ? '#ECFEFF' : 'white',
                display: 'flex', justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ display: 'block' }}>{service.name}</strong>
                <small style={{ color: '#6B7280' }}>{service.duration_minutes} mins</small>
              </div>
              <strong>{service.price} UZS</strong>
            </div>
          ))}
        </div>
      </div>

      {/* 3. BOTTOM: Calendar & Time Slots */}
      <div>
        <h2>2. Select a Time</h2>
        
        {/* Date Picker */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, marginBottom: 20 }}>
          {next7Days.map(date => (
            <button
              key={date}
              onClick={() => {
                setSelectedDate(date);
                setSelectedSlot(null); // Clear slot if they change the date!
              }}
              style={{
                padding: '10px 15px', borderRadius: 20, cursor: 'pointer', border: 'none',
                background: selectedDate === date ? '#1F2937' : '#F3F4F6',
                color: selectedDate === date ? 'white' : '#374151',
                fontWeight: 'bold', whiteSpace: 'nowrap'
              }}
            >
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>

        {/* Time Slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {availableSlotsForDate.length > 0 ? (
            availableSlotsForDate.map(slot => (
              <button
                key={slot.id}
                onClick={() => handleSlotClick(slot)}
                style={{
                  padding: 15, borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontWeight: 'bold',
                  background: selectedSlot?.id === slot.id ? '#06B6D4' : 'white',
                  color: selectedSlot?.id === slot.id ? 'white' : '#06B6D4',
                  border: '1px solid #06B6D4'
                }}
              >
                {slot.start_time.substring(0, 5)}
              </button>
            ))
          ) : (
            <p style={{ color: '#6B7280', gridColumn: '1 / -1' }}>No available slots on this date.</p>
          )}
        </div>
      </div>

      {/* 4. BOTTOM-MOST: Checkout Confirmation */}
      {selectedService && selectedSlot && (
        <div style={{ marginTop: 40, padding: 20, background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: '0 0 10px' }}>Ready to Book?</h3>
          <p style={{ margin: '0 0 15px', color: '#4B5563' }}>
            You are booking a <strong>{selectedService.name}</strong> at <strong>{selectedSlot.start_time.substring(0, 5)}</strong>.
          </p>
          <button
            onClick={handleProceedToCheckout}
            style={{
              width: '100%', padding: '14px', background: '#06B6D4', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Proceed to Checkout
          </button>
        </div>
      )}

      {/* 5. THE LIGHTBOX OVERLAY */}
      {activePhotoIndex !== null && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, // Makes it float above absolutely everything
            display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
          }}
          onClick={(e) => {
            // Close if they click the dark background, but not if they click the image itself
            if(e.target === e.currentTarget) setActivePhotoIndex(null); 
          }}
        >
          {/* Close X Button */}
          <button 
            onClick={() => setActivePhotoIndex(null)} 
            style={{ position: 'absolute', top: 20, right: 30, background: 'none', border: 'none', color: 'white', fontSize: 40, cursor: 'pointer' }}
          >
            &times;
          </button>

          {/* Left Navigation Arrow */}
          {barber.photos.length > 1 && (
            <button 
              onClick={handlePrevPhoto} 
              style={{ position: 'absolute', left: 20, background: 'none', border: 'none', color: 'white', fontSize: 60, cursor: 'pointer', padding: 20 }}
            >
              &#10094;
            </button>
          )}

          {/* The Big Image */}
          <img 
            src={barber.photos[activePhotoIndex].image} 
            alt="Portfolio Fullscreen" 
            style={{ maxHeight: '80vh', maxWidth: '80vw', objectFit: 'contain', borderRadius: 8 }} 
          />
          
          {/* The Image Caption */}
          {barber.photos[activePhotoIndex].caption && (
            <p style={{ color: 'white', marginTop: 20, fontSize: 18 }}>
              {barber.photos[activePhotoIndex].caption}
            </p>
          )}

          {/* Right Navigation Arrow */}
          {barber.photos.length > 1 && (
            <button 
              onClick={handleNextPhoto} 
              style={{ position: 'absolute', right: 20, background: 'none', border: 'none', color: 'white', fontSize: 60, cursor: 'pointer', padding: 20 }}
            >
              &#10095;
            </button>
          )}
        </div>
      )}

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import CXNavbar from '../components/CXNavbar';
import API from '../api/axios';

// 1. Initialize Stripe OUTSIDE the component
const stripePromise = loadStripe('pk_test_51TNCHV2Umd5GiVh3RN3mbDNgGMMIWHn9IakesJS2cbgy3NifxmKPbvBrUOQw1MjTG5qPmztaPaRDqkbX7vpFHja10092q0Cfwo');

// 2. The Inner Form Component (Handles the UI and the actual Payment)
const CheckoutForm = ({ slot, service, barber, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError('');

    // Step A: Confirm the card with Stripe securely
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    if (stripeError) {
      setError(stripeError.message);
      setIsProcessing(false);
      return;
    }

    // Step B: Stripe succeeded, now create the booking in Django!
    if (paymentIntent.status === 'succeeded') {
      try {
        await API.post('bookings/', {
          time_slot: slot.id,
          service: service.id
        });
        
        // Trigger the beautiful success modal!
        setShowSuccessModal(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Payment succeeded, but booking failed. Please contact support.');
      }
    }
    setIsProcessing(false);
  };

  // Styling for the embedded Stripe Card Input
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#111827',
        fontFamily: 'inherit',
        '::placeholder': { color: '#9CA3AF' },
      },
      invalid: { color: '#EF4444' },
    },
  };

  return (
    <>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: 40, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: 28, color: '#111827', letterSpacing: '-0.5px' }}>Complete Booking</h1>
        <p style={{ color: '#6B7280', margin: '0 0 30px 0' }}>Review your appointment details and complete payment.</p>

        {error && <div style={{ background: '#FEE2E2', color: '#EF4444', padding: 15, borderRadius: 8, marginBottom: 20, fontWeight: 'bold' }}>{error}</div>}

        {/* ORDER SUMMARY */}
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 25, marginBottom: 30, border: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: '#374151', textTransform: 'uppercase', letterSpacing: 1 }}>Order Summary</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #E5E7EB' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: '#111827', marginBottom: 4 }}>{service.name}</strong>
              <span style={{ color: '#6B7280', fontSize: 14 }}>with {barber?.user?.first_name || barber?.user?.username}</span>
            </div>
            <strong style={{ fontSize: 18, color: '#111827' }}>{(service.price / 1000)}k UZS</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Date</span>
              <strong style={{ color: '#111827' }}>{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Time</span>
              <strong style={{ color: '#111827' }}>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280' }}>Duration</span>
              <strong style={{ color: '#111827' }}>{service.duration_minutes} minutes</strong>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTop: '1px dashed #D1D5DB', fontSize: 20 }}>
            <span style={{ color: '#111827', fontWeight: 'bold' }}>Total</span>
            <strong style={{ color: '#F43F5E' }}>{service.price.toLocaleString()} UZS</strong>
          </div>
        </div>

        {/* SECURE PAYMENT FORM */}
        <form onSubmit={handlePayment}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: 16, color: '#374151' }}>Payment Details</h3>
          
          <div style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '16px 15px', marginBottom: 25, background: 'white' }}>
            <CardElement options={cardElementOptions} />
          </div>

          <button
            type="submit"
            disabled={!stripe || isProcessing}
            style={{
              width: '100%', padding: '16px', background: isProcessing ? '#FDA4AF' : '#F43F5E', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10
            }}
          >
            {isProcessing ? 'Processing Secure Payment...' : `Pay ${service.price.toLocaleString()} UZS`}
          </button>
          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 15 }}>
            🔒 Secured by Stripe Payments
          </p>
        </form>
      </div>

      {/* CUSTOM SUCCESS NOTIFICATION MODAL */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: 40, borderRadius: 20, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            <div style={{ width: 80, height: 80, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#10B981' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            
            <h2 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: 28 }}>Booking Confirmed!</h2>
            <p style={{ color: '#6B7280', fontSize: 16, margin: '0 0 30px 0', lineHeight: '1.5' }}>
              Your appointment for a <strong>{service.name}</strong> on <strong>{slot.date}</strong> at <strong>{slot.start_time.substring(0, 5)}</strong> has been successfully booked.
            </p>
            
            <button 
              onClick={() => navigate('/bookings')}
              style={{ width: '100%', padding: '14px', background: '#111827', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}
            >
              View My Bookings
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// 3. The Main Wrapper Component
export default function CXCheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Retrieve the data passed from the profile page
  const { slot, service, barber } = location.state || {};
  const [clientSecret, setClientSecret] = useState('');

  // Protect against direct URL visits without data
  useEffect(() => {
    if (slot && service) {
      API.post('create-payment-intent/', { service_id: service.id })
        .then(res => setClientSecret(res.data.clientSecret))
        .catch(err => console.error("Could not fetch payment intent:", err));
    }
  }, [slot, service]);

  if (!slot || !service) {
    return <Navigate to="/search" />;
  }

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', fontFamily: 'inherit' }}>
      <CXNavbar />

      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm slot={slot} service={service} barber={barber} clientSecret={clientSecret} />
          </Elements>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <p style={{ color: '#6B7280', fontSize: 18, fontWeight: 'bold' }}>Loading secure payment gateway...</p>
          </div>
        )}
      </div>
    </div>
  );
}
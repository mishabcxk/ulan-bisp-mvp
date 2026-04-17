import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import API from '../api/axios';

// 1. Initialize Stripe OUTSIDE the component so it doesn't constantly reload
const stripePromise = loadStripe('pk_test_51TNCHV2Umd5GiVh3RN3mbDNgGMMIWHn9IakesJS2cbgy3NifxmKPbvBrUOQw1MjTG5qPmztaPaRDqkbX7vpFHja10092q0Cfwo');

// 2. The actual Credit Card Form Component
const CheckoutForm = ({ slotId, serviceId, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    // Step A: Confirm the card with Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) }
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    // Step B: If Stripe says OK, create the actual Booking in your database!
    if (paymentIntent.status === 'succeeded') {
      try {
        await API.post('bookings/', {
          time_slot: slotId,
          service: serviceId
        });
        alert('Payment successful! Your booking is confirmed. 🎉');
        navigate('/search'); // Send them back to the start (or a 'My Bookings' page)
      } catch (err) {
        // If Django throws a 409 Conflict (slot taken), we catch it here
        setError(err.response?.data?.error || 'Payment succeeded, but booking failed. Please contact support.');
      }
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20, border: '1px solid #E5E7EB', borderRadius: 8, background: 'white' }}>
      <div style={{ padding: '15px 10px', border: '1px solid #D1D5DB', borderRadius: 4, marginBottom: 20 }}>
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#1F2937' } } }} />
      </div>
      
      <button 
        disabled={!stripe || processing} 
        style={{ 
          width: '100%', padding: 14, background: processing ? '#9CA3AF' : '#06B6D4', 
          color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold',
          cursor: processing ? 'not-allowed' : 'pointer'
        }}>
        {processing ? 'Processing Payment...' : 'Confirm & Pay'}
      </button>
      
      {error && <div style={{ color: 'red', marginTop: 15, fontWeight: 'bold' }}>{error}</div>}
    </form>
  );
};

// 3. The Main Page Component
export default function CXCheckoutPage() {
  const [searchParams] = useSearchParams();
  const slotId = searchParams.get('slotId');
  const serviceId = searchParams.get('serviceId');
  
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // When the page loads, ask Django for the secret code
    API.post('create-payment-intent/', { service_id: serviceId })
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => console.error("Could not fetch payment intent:", err));
  }, [serviceId]);

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 20 }}>
      <h1 style={{ marginBottom: 10 }}>Complete Booking</h1>
      <p style={{ color: '#6B7280', marginBottom: 30 }}>
        You are booking Slot #{slotId} for Service #{serviceId}.
      </p>

      {/* We only render the form ONCE Django gives us the secret code */}
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm slotId={slotId} serviceId={serviceId} clientSecret={clientSecret} />
        </Elements>
      ) : (
        <p>Loading secure payment gateway...</p>
      )}
    </div>
  );
}
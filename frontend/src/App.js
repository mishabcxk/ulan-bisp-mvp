import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CXSearchPage from './pages/CXSearchPage';
import CXBarberProfile from './pages/CXBarberProfile';
import CXCheckoutPage from './pages/CXCheckoutPage';
import BXDashboard from './pages/BXDashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRole && user.role !== allowedRole)
    return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* CX Routes */}
          <Route path="/search" element={<CXSearchPage />} />
          <Route path="/barbers/:id" element={<CXBarberProfile />} /> {/* NEW ROUTE HERE */}


          {/* BX Routes - barbers only */}
          <Route path="/bx/dashboard" element={
            <ProtectedRoute allowedRole="barber">
              <BXDashboard />
            </ProtectedRoute>
          } />

          {/* Checkout */}
          <Route path="/checkout" element={<CXCheckoutPage />} />

          <Route path="*" element={<Navigate to="/login" />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
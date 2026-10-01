import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./public/PublicLayout";
import Home from "./public/Home";
import About from "./public/About";
import Contact from "./public/Contact";
import Reserve from "./public/Reserve";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Bookings from "./pages/Bookings";
import Guests from "./pages/Guests";
import CheckIn from "./pages/Check-in";
import Checkout from "./pages/Check-out";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Houskeeping from "./pages/houskeeping";
import Maintenance from "./pages/maintenance";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reserve" element={<Reserve />} />
          </Route>

          {/* Staff login */}
          <Route path="/internal/login" element={<Login />} />

          {/* Protected management system */}
          <Route
            path="/internal"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="guests" element={<Guests />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="check-out" element={<Checkout />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="housekeeping" element={<Houskeeping />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="staff" element={<Staff />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />

            <Route path="*" element={<Navigate to="/internal" replace />} />
          </Route>

          {/* Any unknown top-level path falls back to the public site */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
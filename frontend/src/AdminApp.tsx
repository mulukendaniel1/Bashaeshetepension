import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Website from "./pages/Website";
import Bookings from "./pages/Bookings";
import CheckIn from "./pages/Check-in";
import Checkout from "./pages/Check-out";
import Payments from "./pages/Payments";
import BankSms from "./pages/BankSms";
import BookingRequests from "./pages/BookingRequests";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Houskeeping from "./pages/houskeeping";
import Maintenance from "./pages/maintenance";
import Staff from "./pages/Staff";
import Shifts from "./pages/Shifts";
import ZReport from "./pages/ZReport";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import BankAccountSettings from "./pages/BankAccountSettings";

export default function AdminApp() {
  useEffect(() => {
    document.title = "Basha Eshete Admin";

    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/website" element={<Website />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/check-out" element={<Checkout />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/bank-sms" element={<BankSms />} />
            <Route path="/booking-requests" element={<BookingRequests />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/housekeeping" element={<Houskeeping />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/zreport" element={<ZReport />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/bank-accounts" element={<BankAccountSettings />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
import AdminApp from "./AdminApp";
import PublicApp from "./public/PublicApp";

// bashaeshetepension.com        -> public website
// bashaeshetepension.com/admin  -> staff management system
export default function App() {
  const path = window.location.pathname;
  const isAdmin = path === "/admin" || path.startsWith("/admin/");

  return isAdmin ? <AdminApp /> : <PublicApp />;
}
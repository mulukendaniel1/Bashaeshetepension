import { Navigate } from "react-router-dom";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export function RequireAuth({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  if (!user) {
    return <Navigate to="/internal/login" replace />;
  }

  return <>{children}</>;
}
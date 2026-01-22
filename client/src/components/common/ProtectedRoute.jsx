import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem("isAuthenticated");

  return isAuth ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem("isAuth");

  return isAuth ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

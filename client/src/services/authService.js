import { api } from "./api";

export const sendSignupOtp = async ({ name, email }) => {
  return api.post("/auth/send-otp", { name, email });
};

export const registerUser = async ({ name, email, password, otp }) => {
  const data = await api.post("/auth/register", { name, email, password, otp });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("isAuthenticated", "true");
  return data;
};

export const loginUser = async ({ email, password }) => {
  const data = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("isAuthenticated", "true");
  return data;
};

// One-click login to the shared, read-only demo account (no password needed).
export const demoLogin = async () => {
  const data = await api.post("/auth/demo", {});
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("isAuthenticated", "true");
  return data;
};

export const forgotPassword =({ email }) => api.post("/auth/forgot-password", { email });

export const resetPassword = ({ email, otp, newPassword }) =>
  api.post("/auth/reset-password", { email, otp, newPassword });

export const changePassword = ({ currentPassword, newPassword }) =>
  api.post("/auth/change-password", { currentPassword, newPassword });

export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
};

export const getMe = () => api.get("/auth/me");
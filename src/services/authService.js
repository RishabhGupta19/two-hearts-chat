const BASE_URL = import.meta.env.VITE_WS_BASE_URL;
const API = `${BASE_URL}/api/auth`;

const handleResponse = async (res) => {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Something went wrong");
  }

  return data;
};

// Send OTP
export const sendOtp = async (email) => {
  const res = await fetch(`${API}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return handleResponse(res);
};

// Verify OTP
export const verifyOtp = async (email, otp) => {
  const res = await fetch(`${API}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  return handleResponse(res);
};

// Reset Password
export const resetPassword = async (email, new_password) => {
  const res = await fetch(`${API}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password }),
  });

  return handleResponse(res);
};
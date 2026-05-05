// // import { useState } from 'react';
// // import { useNavigate, useLocation } from 'react-router-dom';
// // import { motion } from 'framer-motion';
// // import { Input } from '@/components/ui/input';
// // import { verifyOtp } from '@/services/authService';

// // const VerifyOTP = () => {
// //   const [otp, setOtp] = useState('');
// //   const [error, setError] = useState('');
// //   const navigate = useNavigate();
// //   const location = useLocation();

// //   const email = location.state?.email;

// //   const handleVerify = async () => {
// //     setError('');

// //     try {
// //       await verifyOtp(email, otp);
// //       navigate('/reset-password', { state: { email } });
// //     } catch (err) {
// //       setError(err.message);
// //     }
// //   };

// //   return (
// //     <div className="flex min-h-screen items-center justify-center bg-background p-4">
// //       <motion.div className="w-full max-w-sm">
// //         <div className="rounded-lg border bg-card p-8 shadow-soft">
// //           <h2 className="text-xl font-bold mb-4 text-center">Enter OTP</h2>

// //           <Input
// //             type="text"
// //             placeholder="Enter OTP"
// //             onChange={(e) => setOtp(e.target.value)}
// //             className="rounded-[12px]"
// //           />

// //           {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}

// //           <button
// //             onClick={handleVerify}
// //             className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
// //           >
// //             Verify OTP
// //           </button>
// //         </div>
// //       </motion.div>
// //     </div>
// //   );
// // };

// // export default VerifyOTP;

// // changes
// import { useState } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Input } from "@/components/ui/input";
// import { verifyOtp } from "@/services/authService";

// const VerifyOTP = () => {
//   const [otp, setOtp] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();
//   const location = useLocation();

//   const email = location.state?.email;

//   const handleVerify = async () => {
//     setError("");

//     try {
//       await verifyOtp(email, otp);
//       navigate("/reset-password", { state: { email } });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div className="w-full max-w-sm">
//         <div className="rounded-lg border bg-card p-8 shadow-soft">

//           <div className="text-center mb-8">
//             <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Solace</h1>
//             <p className="text-sm text-muted-foreground">Enter OTP</p>
//           </div>

//           <Input
//             placeholder="Enter OTP"
//             onChange={(e) => setOtp(e.target.value)}
//             className="rounded-[12px]"
//           />

//           {error && (
//             <p className="text-xs text-destructive text-center mt-2">{error}</p>
//           )}

//           <button
//             onClick={handleVerify}
//             className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
//           >
//             Verify OTP
//           </button>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default VerifyOTP;

// changes
// src/pages/VerifyOTP.jsx
// import { useState, useRef, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { motion } from "framer-motion";
// import { verifyOtp, sendOtp } from "@/services/authService";
// import { Loader2, ArrowLeft } from "lucide-react";

// const VerifyOTP = () => {
//   const [otp, setOtp] = useState(Array(6).fill(""));
//   const [loading, setLoading] = useState(false);
//   const [resendLoading, setResendLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [timer, setTimer] = useState(30);

//   const inputs = useRef([]);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const email = location.state?.email;

//   // 🔒 Protect route
//   useEffect(() => {
//     if (!email) {
//       navigate("/forgot-password", { replace: true });
//     }
//   }, []);

//   // ⏱ Timer
//   useEffect(() => {
//     if (timer === 0) return;
//     const interval = setInterval(() => setTimer((t) => t - 1), 1000);
//     return () => clearInterval(interval);
//   }, [timer]);

//   // 🔥 INPUT CHANGE
//   const handleChange = (val, i) => {
//     if (!/^\d?$/.test(val)) return;

//     const newOtp = [...otp];
//     newOtp[i] = val;
//     setOtp(newOtp);

//     // 👉 move forward
//     if (val && i < 5) {
//       inputs.current[i + 1].focus();
//     }

//     // 👉 auto submit
//     const fullOtp = newOtp.join("");
//     if (fullOtp.length === 6) {
//       handleVerify(fullOtp);
//     }
//   };

//   // ⬅️ BACKSPACE
//   const handleKeyDown = (e, i) => {
//     if (e.key === "Backspace") {
//       if (otp[i]) {
//         const newOtp = [...otp];
//         newOtp[i] = "";
//         setOtp(newOtp);
//       } else if (i > 0) {
//         inputs.current[i - 1].focus();
//       }
//     }
//   };

//   // 🖱 CLICK FIX
//   const handleFocus = (i) => {
//     inputs.current[i].select();
//   };

//   // 📋 PASTE
//   const handlePaste = (e) => {
//     if (loading) return;

//     const paste = e.clipboardData.getData("text").slice(0, 6);
//     if (!/^\d+$/.test(paste)) return;

//     const arr = paste.split("");
//     setOtp(arr);

//     handleVerify(arr.join(""));
//   };

//   // ✅ VERIFY FUNCTION (ONLY ONE GUARD HERE)
//   const handleVerify = async (code) => {
//     if (loading) return;

//     setLoading(true);
//     setError("");

//     try {
//       const res = await verifyOtp(email, code);

//       if (!res?.token) {
//         throw new Error("Invalid OTP response");
//       }

//       navigate("/reset-password", {
//         state: { email, token: res.token },
//         replace: true, // prevents back/forward flicker
//       });

//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 🔁 RESEND OTP
//   const handleResend = async () => {
//     if (resendLoading) return;

//     setResendLoading(true);

//     try {
//       await sendOtp(email);
//       setTimer(30);
//       setOtp(Array(6).fill(""));
//       inputs.current[0].focus();
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setResendLoading(false);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div
//         initial={{ opacity: 0, y: 16 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="w-full max-w-sm"
//       >
//         <div className="rounded-lg border bg-card p-8 shadow-soft text-center">

//           {/* HEADER */}
//           <div className="mb-6">
//             <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
//               Solace
//             </h1>
//             <p className="text-sm text-muted-foreground">
//               Enter OTP sent to {email}
//             </p>
//           </div>

//           {/* OTP INPUTS */}
//           <div className="flex justify-between gap-2 mb-5" onPaste={handlePaste}>
//             {otp.map((digit, i) => (
//               <input
//                 key={i}
//                 ref={(el) => (inputs.current[i] = el)}
//                 value={digit}
//                 maxLength="1"
//                 onChange={(e) => handleChange(e.target.value, i)}
//                 onKeyDown={(e) => handleKeyDown(e, i)}
//                 onFocus={() => handleFocus(i)}
//                 className="w-11 h-12 text-center text-lg border rounded-[12px] bg-background focus:ring-2 focus:ring-primary outline-none"
//               />
//             ))}
//           </div>

//           {/* ERROR */}
//           {error && (
//             <p className="text-xs text-destructive mb-3">{error}</p>
//           )}

//           {/* VERIFY BUTTON */}
//           <motion.button
//             whileTap={{ scale: 0.97 }}
//             onClick={() => handleVerify(otp.join(""))}
//             disabled={loading}
//             className="w-full rounded-pill bg-primary py-3 text-primary-foreground flex justify-center items-center gap-2 disabled:opacity-50"
//           >
//             {loading && <Loader2 className="h-4 w-4 animate-spin" />}
//             Verify OTP
//           </motion.button>

//           {/* RESEND */}
//           <div className="mt-4 text-sm text-muted-foreground">
//             {timer > 0 ? (
//               <p>Resend in {timer}s</p>
//             ) : (
//               <button
//                 onClick={handleResend}
//                 disabled={resendLoading}
//                 className="text-primary hover:underline"
//               >
//                 {resendLoading ? "Sending..." : "Resend OTP"}
//               </button>
//             )}

//               <button
//                 onClick={() => navigate("/login", { replace: true })}
//                 className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition mb-4"
//               >
//                 <ArrowLeft className="w-4 h-4" />
//                 Back to Login
//               </button>

//           </div>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default VerifyOTP;

// last changes
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyOtp, sendOtp } from "@/services/authService";
import { Loader2, ArrowLeft } from "lucide-react";

const VerifyOTP = () => {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  const inputs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // ✅ Protect route
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email]);

  // ⏱ Timer
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // 🔥 INPUT CHANGE
  const handleChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[i] = val;
    setOtp(newOtp);

    if (val && i < 5) {
      inputs.current[i + 1].focus();
    }

    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      handleVerify(fullOtp);
    }
  };

  // ⬅️ BACKSPACE
  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace") {
      if (otp[i]) {
        const newOtp = [...otp];
        newOtp[i] = "";
        setOtp(newOtp);
      } else if (i > 0) {
        inputs.current[i - 1].focus();
      }
    }
  };

  // 🖱 FOCUS
  const handleFocus = (i) => {
    inputs.current[i].select();
  };

  // 📋 PASTE
  const handlePaste = (e) => {
    if (loading) return;

    const paste = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(paste)) return;

    const arr = paste.split("");
    setOtp(arr);

    handleVerify(arr.join(""));
  };

  // ✅ VERIFY
  const handleVerify = async (code) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await verifyOtp(email, code);

      if (!res?.token) {
        throw new Error("Invalid OTP response");
      }

      navigate("/reset-password", {
        state: { email, token: res.token },
        replace: true,
      });

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 RESEND
  const handleResend = async () => {
    if (resendLoading) return;

    setResendLoading(true);

    try {
      await sendOtp(email);
      setTimer(30);
      setOtp(Array(6).fill(""));
      inputs.current[0].focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div className="w-full max-w-sm">
        <div className="rounded-lg border bg-card p-8 shadow-soft">

         

          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">Solace</h1>
            <p className="text-sm text-muted-foreground">
              Enter OTP sent to {email}
            </p>
          </div>

          {/* OTP */}
          <div className="flex justify-between gap-2 mb-5" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={digit}
                maxLength="1"
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onFocus={() => handleFocus(i)}
                className="w-11 h-12 text-center text-lg border rounded-[12px] focus:ring-2 focus:ring-primary outline-none"
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-destructive text-center mb-3">{error}</p>
          )}

          {/* BUTTON */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleVerify(otp.join(""))}
            disabled={loading}
            className="w-full rounded-pill bg-primary py-3 text-white flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify OTP
          </motion.button>

          {/* RESEND */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {timer > 0 ? (
              <p>Resend in {timer}s</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-primary hover:underline"
              >
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>
            {/* BACK BUTTON */}
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      </motion.div>

    </div>
  );
};

export default VerifyOTP;
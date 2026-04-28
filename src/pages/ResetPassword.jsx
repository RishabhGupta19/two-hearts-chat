// // import { useState } from 'react';
// // import { useNavigate, useLocation } from 'react-router-dom';
// // import { motion } from 'framer-motion';
// // import { Input } from '@/components/ui/input';
// // import { resetPassword } from '@/services/authService';

// // const ResetPassword = () => {
// //   const [password, setPassword] = useState('');
// //   const [error, setError] = useState('');
// //   const navigate = useNavigate();
// //   const location = useLocation();

// //   const email = location.state?.email;

// //   const handleReset = async () => {
// //     setError('');

// //     try {
// //       await resetPassword(email, password);
// //       navigate('/login');
// //     } catch (err) {
// //       setError(err.message);
// //     }
// //   };

// //   return (
// //     <div className="flex min-h-screen items-center justify-center bg-background p-4">
// //       <motion.div className="w-full max-w-sm">
// //         <div className="rounded-lg border bg-card p-8 shadow-soft">
// //           <h2 className="text-xl font-bold mb-4 text-center">Reset Password</h2>

// //           <Input
// //             type="password"
// //             placeholder="New Password"
// //             onChange={(e) => setPassword(e.target.value)}
// //             className="rounded-[12px]"
// //           />

// //           {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}

// //           <button
// //             onClick={handleReset}
// //             className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
// //           >
// //             Reset Password
// //           </button>
// //         </div>
// //       </motion.div>
// //     </div>
// //   );
// // };

// // export default ResetPassword;

// // changes
// import { useState } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Input } from "@/components/ui/input";
// import { resetPassword } from "@/services/authService";

// const ResetPassword = () => {
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();
//   const location = useLocation();

//   const email = location.state?.email;

//   const handleReset = async () => {
//     setError("");

//     try {
//       await resetPassword(email, password);
//       navigate("/login");
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
//             <p className="text-sm text-muted-foreground">Reset Password</p>
//           </div>

//           <Input
//             type="password"
//             placeholder="New Password"
//             onChange={(e) => setPassword(e.target.value)}
//             className="rounded-[12px]"
//           />

//           {error && (
//             <p className="text-xs text-destructive text-center mt-2">{error}</p>
//           )}

//           <button
//             onClick={handleReset}
//             className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
//           >
//             Reset Password
//           </button>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default ResetPassword;


// changes
// src/pages/ResetPassword.jsx
// import { useState,useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Input } from "@/components/ui/input";
// import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
// import { resetPassword } from "@/services/authService";

// const ResetPassword = () => {
//   const [password, setPassword] = useState("");
//   const [confirm, setConfirm] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();
//   const location = useLocation();

//   const email = location.state?.email;
//   const token = location.state?.token;

//   const handleReset = async () => {
//     if (loading) return;

//     if (password.length < 6) {
//       return setError("Password must be at least 6 characters");
//     }

//     if (password !== confirm) {
//       return setError("Passwords do not match");
//     }

//     setLoading(true);
//     setError("");

//     try {
//       await resetPassword(email, password, token);
//       navigate("/login");
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };
  
// // protect page
// useEffect(() => {
//   if (!email || !token) {
//     navigate("/login", { replace: true });
//   }
// }, [email, token]);

// // block back button
// useEffect(() => {
//   window.history.pushState(null, "", window.location.href);

//   window.onpopstate = () => {
//     navigate("/login", { replace: true });
//   };

//   return () => {
//     window.onpopstate = null;
//   };
// }, []);

// // prevent UI render
// if (!email || !token) return null;

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div className="w-full max-w-sm">
//         <div className="rounded-lg border bg-card p-8 shadow-soft">

//           {/* HEADER */}
//           <div className="text-center mb-8">
//             <h1 className="text-3xl font-bold">Solace</h1>
//             <p className="text-sm text-muted-foreground">
//               Reset your password
//             </p>
//           </div>

//           {/* PASSWORD */}
//           <div className="relative">
//             <Input
//               type={showPassword ? "text" : "password"}
//               placeholder="New Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="rounded-[12px] pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
//             >
//               {showPassword ? (
//                 <EyeOff className="h-4 w-4" />
//               ) : (
//                 <Eye className="h-4 w-4" />
//               )}
//             </button>
//           </div>

//           {/* CONFIRM PASSWORD */}
//           <div className="relative mt-3">
//             <Input
//               type={showConfirm ? "text" : "password"}
//               placeholder="Confirm Password"
//               value={confirm}
//               onChange={(e) => setConfirm(e.target.value)}
//               className="rounded-[12px] pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowConfirm(!showConfirm)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
//             >
//               {showConfirm ? (
//                 <EyeOff className="h-4 w-4" />
//               ) : (
//                 <Eye className="h-4 w-4" />
//               )}
//             </button>
//           </div>

//           {/* ERROR */}
//           {error && (
//             <p className="text-xs text-destructive text-center mt-3">
//               {error}
//             </p>
//           )}

//           {/* BUTTON */}
//           <motion.button
//             whileTap={{ scale: 0.97 }}
//             onClick={handleReset}
//             disabled={loading}
//             className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
//           >
//             {loading && <Loader2 className="h-4 w-4 animate-spin" />}
//             Reset Password
//           </motion.button>

//           <button
//             onClick={() => navigate("/login", { replace: true })}
//             className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition mb-4"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             Back to Login
//           </button>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default ResetPassword;

// last changes
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { resetPassword } from "@/services/authService";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const token = location.state?.token;

  // ✅ Protect route
 useEffect(() => {
  if (!email || !token) {
    navigate("/login", { replace: true });
  }
}, [email, token]);

// 👇 ADD THIS HERE
useEffect(() => {
  const handlePopState = () => {
    navigate("/login", { replace: true });
  };

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);

  // ✅ Prevent render if invalid
  if (!email || !token) return null;

  const handleReset = async () => {
    if (loading) return;

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError("");

    try {
      await resetPassword(email, password, token);

      navigate("/login", { replace: true }); // ✅ important fix
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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
              Reset your password
            </p>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* CONFIRM */}
          <div className="relative mt-3">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center mt-3">{error}</p>
          )}

          {/* BUTTON */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            disabled={loading}
            className="w-full mt-4 bg-primary text-white py-3 rounded-pill flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset Password
          </motion.button>

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

export default ResetPassword;
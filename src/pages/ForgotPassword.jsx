// // import { useState } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import { motion } from 'framer-motion';
// // import { Input } from '@/components/ui/input';
// // import { sendOtp } from '@/services/authService';

// // const ForgotPassword = () => {
// //   const [email, setEmail] = useState('');
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState('');
// //   const navigate = useNavigate();

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     if (!email) return;

// //     setLoading(true);
// //     setError('');

// //     try {
// //       await sendOtp(email);
// //       navigate('/verify-otp', { state: { email } });
// //     } catch (err) {
// //       setError(err.message);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="flex min-h-screen items-center justify-center bg-background p-4">
// //       <motion.div className="w-full max-w-sm">
// //         <div className="rounded-lg border bg-card p-8 shadow-soft">
// //           <h2 className="text-xl font-bold mb-4 text-center">Forgot Password</h2>

// //           <form onSubmit={handleSubmit} className="space-y-4">
// //             <Input
// //               type="email"
// //               placeholder="Enter your email"
// //               value={email}
// //               onChange={(e) => setEmail(e.target.value)}
// //               className="rounded-[12px]"
// //             />

// //             {error && <p className="text-xs text-destructive text-center">{error}</p>}

// //             <button
// //               type="submit"
// //               disabled={loading}
// //               className="w-full rounded-pill bg-primary py-3 text-primary-foreground"
// //             >
// //               {loading ? "Sending..." : "Send OTP"}
// //             </button>
// //           </form>
// //         </div>
// //       </motion.div>
// //     </div>
// //   );
// // };

// // export default ForgotPassword;

// // changes
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Input } from "@/components/ui/input";
// import { sendOtp } from "@/services/authService";

// const ForgotPassword = () => {
//   const [email, setEmail] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!email) return;

//     setLoading(true);
//     setError("");

//     try {
//       await sendOtp(email);
//       navigate("/verify-otp", { state: { email } });
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div
//         initial={{ opacity: 0, y: 16 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="w-full max-w-sm"
//       >
//         <div className="rounded-lg border bg-card p-8 shadow-soft">

//           {/* HEADER SAME AS LOGIN */}
//           <div className="text-center mb-8">
//             <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Solace</h1>
//             <p className="text-sm text-muted-foreground font-body">
//               Reset your password
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <Input
//               type="email"
//               placeholder="Enter your email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="rounded-[12px]"
//             />

//             {error && (
//               <p className="text-xs text-destructive text-center">{error}</p>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full rounded-pill bg-primary py-3 text-primary-foreground"
//             >
//               {loading ? "Sending..." : "Send OTP"}
//             </button>
//           </form>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default ForgotPassword;

// changes

// src/pages/ForgotPassword.jsx
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Input } from "@/components/ui/input";
// import { Loader2, ArrowLeft } from "lucide-react";
// import { sendOtp } from "@/services/authService";

// const ForgotPassword = () => {
//   const [email, setEmail] = useState("");
//   const [touched, setTouched] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const navigate = useNavigate();

//   // ✅ simple email validation
//   const isValidEmail = (value) =>
//     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

//   const showError = touched && (!email || !isValidEmail(email));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setTouched(true);

//     if (!email || !isValidEmail(email) || loading) return;

//     setLoading(true);
//     setMessage("");

//     try {
//       await sendOtp(email);

//       // ✅ security-safe message
//       setMessage("If your email is registered, you’ll receive an OTP shortly.");

//       setTimeout(() => {
//         navigate("/verify-otp", { state: { email } });
//       }, 1000);

//     } catch (err) {
//       setMessage(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div
//         initial={{ opacity: 0, y: 16 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="w-full max-w-sm"
//       >
//         <div className="rounded-lg border bg-card p-8 shadow-soft">

//           {/* 🔙 BACK BUTTON */}
//           <button
//             onClick={() => navigate("/login")}
//             className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
//           >
//             <ArrowLeft className="h-4 w-4 mr-1" />
//             Back to login
//           </button>

//           {/* HEADER */}
//           <div className="text-center mb-8">
//             <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
//               Solace
//             </h1>
//             <p className="text-sm text-muted-foreground font-body">
//               Forgot your password?
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">

//             {/* EMAIL FIELD */}
//             <div className="space-y-1">
//               <label className="text-xs font-medium text-foreground">
//                 Email
//               </label>

//               <Input
//                 type="email"
//                 placeholder="hello@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 onBlur={() => setTouched(true)}
//                 className={`rounded-[12px] ${
//                   showError ? "border-red-500" : ""
//                 }`}
//               />
//             </div>

//             {/* ERROR */}
//             {showError && (
//               <p className="text-xs text-destructive text-center">
//                 Enter a valid email address
//               </p>
//             )}

//             {/* SUCCESS / INFO */}
//             {message && (
//               <p className="text-xs text-center text-muted-foreground">
//                 {message}
//               </p>
//             )}

//             {/* BUTTON */}
//             <motion.button
//               whileTap={{ scale: 0.97 }}
//               type="submit"
//               disabled={loading}
//               className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
//             >
//               {loading && <Loader2 className="h-4 w-4 animate-spin" />}
//               Send OTP
//             </motion.button>

//           </form>

//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default ForgotPassword;

// changes2
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { sendOtp } from "@/services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const showError = touched && (!email || !isValidEmail(email));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    if (!email || !isValidEmail(email) || loading) return;

    setLoading(true);
    setMessage("");

    try {
      await sendOtp(email);

      setMessage("If your email is registered, you’ll receive an OTP.");

      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 800);

    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-lg border bg-card p-8 shadow-soft">

          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Solace
            </h1>
            <p className="text-sm text-muted-foreground">
              Forgot your password?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Email
              </label>

              <Input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                className={`rounded-[12px] ${
                  showError ? "border-red-500" : ""
                }`}
              />
            </div>

            {showError && (
              <p className="text-xs text-destructive text-center">
                Enter a valid email address
              </p>
            )}

            {message && (
              <p className="text-xs text-center text-muted-foreground">
                {message}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-primary py-3 text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send OTP
            </motion.button>

          </form>

          {/* BACK TO LOGIN */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Remember your password?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </button>
          </p>

        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
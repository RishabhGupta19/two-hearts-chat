// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import { Input } from '@/components/ui/input';
// import { sendOtp } from '@/services/authService';

// const ForgotPassword = () => {
//   const [email, setEmail] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!email) return;

//     setLoading(true);
//     setError('');

//     try {
//       await sendOtp(email);
//       navigate('/verify-otp', { state: { email } });
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div className="w-full max-w-sm">
//         <div className="rounded-lg border bg-card p-8 shadow-soft">
//           <h2 className="text-xl font-bold mb-4 text-center">Forgot Password</h2>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <Input
//               type="email"
//               placeholder="Enter your email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="rounded-[12px]"
//             />

//             {error && <p className="text-xs text-destructive text-center">{error}</p>}

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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { sendOtp } from "@/services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      await sendOtp(email);
      navigate("/verify-otp", { state: { email } });
    } catch (err) {
      setError(err.message);
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

          {/* HEADER SAME AS LOGIN */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Solace</h1>
            <p className="text-sm text-muted-foreground font-body">
              Reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[12px]"
            />

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-primary py-3 text-primary-foreground"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
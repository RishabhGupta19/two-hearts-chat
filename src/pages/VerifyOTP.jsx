// import { useState } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import { Input } from '@/components/ui/input';
// import { verifyOtp } from '@/services/authService';

// const VerifyOTP = () => {
//   const [otp, setOtp] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
//   const location = useLocation();

//   const email = location.state?.email;

//   const handleVerify = async () => {
//     setError('');

//     try {
//       await verifyOtp(email, otp);
//       navigate('/reset-password', { state: { email } });
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div className="w-full max-w-sm">
//         <div className="rounded-lg border bg-card p-8 shadow-soft">
//           <h2 className="text-xl font-bold mb-4 text-center">Enter OTP</h2>

//           <Input
//             type="text"
//             placeholder="Enter OTP"
//             onChange={(e) => setOtp(e.target.value)}
//             className="rounded-[12px]"
//           />

//           {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}

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
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { verifyOtp } from "@/services/authService";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const handleVerify = async () => {
    setError("");

    try {
      await verifyOtp(email, otp);
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div className="w-full max-w-sm">
        <div className="rounded-lg border bg-card p-8 shadow-soft">

          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Solace</h1>
            <p className="text-sm text-muted-foreground">Enter OTP</p>
          </div>

          <Input
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
            className="rounded-[12px]"
          />

          {error && (
            <p className="text-xs text-destructive text-center mt-2">{error}</p>
          )}

          <button
            onClick={handleVerify}
            className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
          >
            Verify OTP
          </button>

        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
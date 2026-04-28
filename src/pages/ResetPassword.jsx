// import { useState } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import { Input } from '@/components/ui/input';
// import { resetPassword } from '@/services/authService';

// const ResetPassword = () => {
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();
//   const location = useLocation();

//   const email = location.state?.email;

//   const handleReset = async () => {
//     setError('');

//     try {
//       await resetPassword(email, password);
//       navigate('/login');
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4">
//       <motion.div className="w-full max-w-sm">
//         <div className="rounded-lg border bg-card p-8 shadow-soft">
//           <h2 className="text-xl font-bold mb-4 text-center">Reset Password</h2>

//           <Input
//             type="password"
//             placeholder="New Password"
//             onChange={(e) => setPassword(e.target.value)}
//             className="rounded-[12px]"
//           />

//           {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}

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
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/services/authService";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const handleReset = async () => {
    setError("");

    try {
      await resetPassword(email, password);
      navigate("/login");
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
            <p className="text-sm text-muted-foreground">Reset Password</p>
          </div>

          <Input
            type="password"
            placeholder="New Password"
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-[12px]"
          />

          {error && (
            <p className="text-xs text-destructive text-center mt-2">{error}</p>
          )}

          <button
            onClick={handleReset}
            className="w-full mt-4 rounded-pill bg-primary py-3 text-primary-foreground"
          >
            Reset Password
          </button>

        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

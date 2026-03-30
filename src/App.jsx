import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import { onMessage } from "firebase/messaging";
import { messaging } from "@/firebase";
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import Assessment from "./pages/Assessment";
import NicknameSetup from "./pages/NicknameSetup";
import PartnerLinking from "./pages/PartnerLinking";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Goals from "./pages/Goals";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";
import IOSInstallBanner from "@/components/IOSInstallBanner";


import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();


const useFirebaseForegroundMessages = () => {
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "New Message";

      const body =
        payload.notification?.body ||
        payload.data?.body ||
        "";

      // Toast
      toast(title, { description: body });

      // System notification
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192.png",
        });
      }
    });

    return () => unsubscribe();
  }, []);
};

const AppRoutes = () => {
  const { isAuthenticated, userRole, assessmentCompleted, nickname, isLinked, loading } = useApp();
  useFirebaseForegroundMessages();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (!userRole) {
    return (
      <Routes>
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="*" element={<Navigate to="/role-selection" replace />} />
      </Routes>
    );
  }

  if (!assessmentCompleted) {
    return (
      <Routes>
        <Route path="/assessment" element={<Assessment />} />
        <Route path="*" element={<Navigate to="/assessment" replace />} />
      </Routes>
    );
  }

 const onboardingComplete = localStorage.getItem('onboarding_complete') === 'true';

if (!nickname && !onboardingComplete) {
  return (
    <Routes>
      <Route path="/nickname" element={<NicknameSetup />} />
      <Route path="*" element={<Navigate to="/nickname" replace />} />
    </Routes>
  );
}

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/partner-linking" element={<PartnerLinking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// const App = () => (
  
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <AppProvider>
//         <BrowserRouter>
//             <AppRoutes />
          
//           <IOSInstallBanner />
//         </BrowserRouter>
//       </AppProvider>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

const App = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
        })
        .catch((err) => {
          console.error("SW registration failed:", err);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <HashRouter>
            <AppRoutes />
            <IOSInstallBanner />
          </HashRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

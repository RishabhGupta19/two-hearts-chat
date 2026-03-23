import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import { onMessageListener } from "@/firebase";
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import Assessment from "./pages/Assessment";
import NicknameSetup from "./pages/NicknameSetup";
import PartnerLinking from "./pages/PartnerLinking";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Goals from "./pages/Goals";
import NotFound from "./pages/NotFound";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import PullToRefresh from "@/components/PullToRefresh";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const useFirebaseForegroundMessages = () => {
  useEffect(() => {
    const listen = () => {
      onMessageListener()
        .then((payload) => {
          toast(payload?.notification?.title || "New message", {
            description: payload?.notification?.body || "",
          });
          listen(); // re-subscribe for next message
        })
        .catch((err) => console.error("FCM foreground error:", err));
    };
    listen();
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

  if (!nickname) {
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <PullToRefresh>
            <AppRoutes />
          </PullToRefresh>
          <IOSInstallBanner />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

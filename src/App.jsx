import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import MusicPlayer from "@/components/MusicPlayer";
import useBackgroundAudio from "@/hooks/useBackgroundAudio";
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import Assessment from "./pages/Assessment";
import NicknameSetup from "./pages/NicknameSetup";
import PartnerLinking from "./pages/PartnerLinking";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Goals from "./pages/Goals";
import Gallery from "./pages/Gallery";
import Music from "./pages/Music";
import NotFound from "./pages/NotFound";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import { Loader2 } from "lucide-react";


import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

// Foreground push handling is centralized in AppContext via subscribeToForegroundMessages

const AppRoutes = () => {
  const { isAuthenticated, userRole, assessmentCompleted, onboardingComplete, nickname, isLinked, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
// commented because it is giving error in  forgot password feature
  // if (!isAuthenticated) {
  //   return (
  //     <Routes>
  //       <Route path="*" element={<Login />} />
  //     </Routes>
  //   );
  // }
// below changes for forgot password feature
if (!isAuthenticated) {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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

  if (!onboardingComplete) {
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
      <Route path="/music" element={<Music />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
    </Routes>
  );
};

const GlobalMusicPlayer = ({ onUnlockAudio }) => {
  const {
    currentSong,
    currentQueue,
    currentIndex,
    musicWasPlaying,
    musicShouldResume,
    musicPosition,
    playNextTrack,
    playPrevTrack,
    closeMusicPlayer,
    updateMusicPlayback,
  } = useApp();
  const location = useLocation();
  const showPlayerUi = location.pathname === "/music";

  const hasQueue = currentQueue.length > 1;
  const canGoNext = hasQueue && currentIndex < currentQueue.length - 1;
  const canGoPrev = hasQueue && currentIndex > 0;

  return (
    <AnimatePresence>
      {currentSong && (
        <MusicPlayer
          visible={showPlayerUi}
          song={currentSong}
          queue={currentQueue}
          autoPlay={musicShouldResume || musicWasPlaying}
          initialSeekTime={musicPosition}
          onUnlockAudio={onUnlockAudio}
          onPlaybackStateChange={updateMusicPlayback}
          onClose={closeMusicPlayer}
          // Always pass the function when queue has songs — handleEnded needs
          // a non-null onPlayNext to advance the queue. canPlayNext controls
          // the UI disabled state separately.
          // Change this in GlobalMusicPlayer:
          onPlayNext={canGoNext ? playNextTrack : null}
          onPlayPrev={canGoPrev ? playPrevTrack : null}
          canPlayNext={canGoNext}
          canPlayPrev={canGoPrev}
        />
      )}
    </AnimatePresence>
  );
};

const App = () => {
  const { unlock } = useBackgroundAudio();

  useEffect(() => {
    const enforceFirebaseMessagingWorker = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          const scriptUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
          if (scriptUrl.endsWith('/sw.js')) {
            await reg.unregister();
          }
        }
      } catch (err) {
        console.warn('Failed to cleanup old service worker registrations', err);
      }

      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .catch((err) => {
          console.error('SW registration failed:', err);
        });
    };

    enforceFirebaseMessagingWorker();

    const onLoad = () => {
      enforceFirebaseMessagingWorker();
    };
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <HashRouter>
            <AppRoutes />
            <GlobalMusicPlayer onUnlockAudio={unlock} />
            <IOSInstallBanner />
          </HashRouter>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

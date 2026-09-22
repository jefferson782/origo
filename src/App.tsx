import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageSkeleton } from "./components/ui/loading";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const MinhaEscala = lazy(() => import("./pages/MinhaEscala.tsx"));
const Geral = lazy(() => import("./pages/Geral.tsx"));
const Perfil = lazy(() => import("./pages/Perfil.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin.tsx"));
const Gerenciar = lazy(() => import("./pages/Gerenciar.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/minha-escala" element={<ProtectedRoute><MinhaEscala /></ProtectedRoute>} />
              <Route path="/geral" element={<ProtectedRoute><Geral /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/gerenciar" element={<ProtectedRoute><Gerenciar /></ProtectedRoute>} />
              <Route path="/super-admin" element={<ProtectedRoute requireSuperAdmin><SuperAdmin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

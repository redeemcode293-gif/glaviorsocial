import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NewOrder from "./pages/NewOrder";
import Orders from "./pages/Orders";
import Refills from "./pages/Refills";
import AddFunds from "./pages/AddFunds";
import Referrals from "./pages/Referrals";
import ApiDocs from "./pages/ApiDocs";
import Updates from "./pages/Updates";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import AIChatbot from "./components/AIChatbot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-order" element={<NewOrder />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/refills" element={<Refills />} />
          <Route path="/add-funds" element={<AddFunds />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <AIChatbot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Workspace from "./pages/workSpace";
import History from "./pages/History";
import Analysis from "./pages/Analysis";
import Analytics from "./pages/Analytics";
import OptimizationLab from "./pages/OptimizationLab";
import RequireAuth from "./components/auth/requireAuth";
import Login from "./pages/login";
import Signup from "./pages/signin";
import { QueryAnalysisProvider } from "./context/QueryAnalysisContext";

export default function App() {
  return (
    <QueryAnalysisProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Workspace />} />
          <Route path="history" element={<History />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="optimization-lab" element={<OptimizationLab />} />
        </Route>
      </Routes>
    </QueryAnalysisProvider>
  );
}
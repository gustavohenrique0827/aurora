import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app/routes";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

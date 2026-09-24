import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthProvider } from "./context/AuthContext";
import { FeedProvider } from "./context/FeedContext";
import { FeedPage } from "./pages/FeedPage";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <AuthProvider>
      <FeedProvider>
        <Router>
          <div className="scanlines" />
          <div className="vignette" />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/feed" element={<FeedPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </FeedProvider>
    </AuthProvider>
  );
}

export default App;

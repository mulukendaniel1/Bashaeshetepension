import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicLayout from "./PublicLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import RoomsPage from "./pages/RoomsPage";
import BookPage from "./pages/BookPage";
import ContactPage from "./pages/ContactPage";

export default function PublicApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
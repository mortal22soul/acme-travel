import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { cookies, headers } from "next/headers";
import Nav from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { AccountCart } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ACME Travel", template: "%s | ACME Travel" },
  description: "Browse curated trips, itineraries, and traveler reviews.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [jar, request] = await Promise.all([cookies(), headers()]);
  const stored = jar.get("acme_theme")?.value;
  const theme = stored === "light" || stored === "dark" ? stored : "system";
  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        {!stored && <script nonce={request.get("x-nonce") ?? undefined} dangerouslySetInnerHTML={{
          __html: "try{var t=localStorage.getItem('acme:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}",
        }} />}
      </head>
      <body className={`${GeistSans.variable} antialiased`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <ThemeProvider initialTheme={theme}>
          <AuthProvider>
            <AccountCart>
              <Nav />
              <main id="main-content" tabIndex={-1}>{children}</main>
              <Footer />
            </AccountCart>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

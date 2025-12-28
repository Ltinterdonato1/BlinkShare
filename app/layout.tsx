"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner"; // 🔹 Import Toaster

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Navbar will be hidden on these pages
  const authRoutes = ["/login", "/signup"];
  const isAuthPage = authRoutes.includes(pathname);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            {!isAuthPage && <Navbar />}
            
            <main className={`flex-1 ${!isAuthPage ? "pt-0 sm:pt-14 pb-14 sm:pb-0" : ""}`}>
              {children}
            </main>
          </div>
          
          {/* 🔹 Added Toaster here */}
          <Toaster 
            theme="dark" 
            position="bottom-center" 
            richColors 
            closeButton
          />
        </Providers>
      </body>
    </html>
  );
}
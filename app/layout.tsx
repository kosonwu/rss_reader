import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RSS Reader",
  description: "A focused RSS reader with keyword filtering and automated feed fetching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <header className="fixed top-0 right-0 z-50 flex items-center gap-2.5 px-6 py-4">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="h-8 px-4 font-mono text-[11px] tracking-widest uppercase text-amber-400 border border-amber-500/30 rounded-md bg-amber-500/5 hover:bg-amber-500/15 transition-colors cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="h-8 px-4 font-mono text-[11px] tracking-widest uppercase text-black bg-amber-400 rounded-md hover:bg-amber-300 transition-colors cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}

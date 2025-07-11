import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Todo List - Stay Organized",
  description: "A beautiful and efficient todo list application to help you stay organized and productive.",
  keywords: ["todo", "tasks", "productivity", "organization", "task management"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name",
  openGraph: {
    title: "Todo List - Stay Organized",
    description: "A beautiful and efficient todo list application to help you stay organized and productive.",
    type: "website",
    siteName: "Todo List",
  },
  twitter: {
    card: "summary_large_image",
    title: "Todo List - Stay Organized",
    description: "A beautiful and efficient todo list application to help you stay organized and productive.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a1d24" />
      </head>
      <body 
        className={inter.className}
        data-new-gr-c-s-check-loaded=""
        data-gr-ext-installed=""
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

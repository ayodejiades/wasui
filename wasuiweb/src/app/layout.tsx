import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "mapbox-gl/dist/mapbox-gl.css";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { validateEnvironment, logEnvironmentStatus } from "../utils/env";

const inter = Inter({ subsets: ["latin"] });

// Validate environment on module load
if (typeof window !== 'undefined') {
  logEnvironmentStatus();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00eaff",
};

export const metadata: Metadata = {
  title: "waSUI - AR Treasure Hunt on Sui Blockchain",
  description: "Zero-knowledge geolocation treasure hunting game with augmented reality on Sui blockchain. Find, create, and claim treasures in the real world.",
  keywords: ["sui", "blockchain", "ar", "augmented reality", "treasure hunt", "web3", "gaming", "geolocation", "zk-snarks"],
  authors: [{ name: "waSUI Team" }],
  openGraph: {
    title: "waSUI - AR Treasure Hunt",
    description: "Find treasures in the real world with AR and blockchain technology",
    type: "website",
    siteName: "waSUI",
  },
  twitter: {
    card: "summary_large_image",
    title: "waSUI - AR Treasure Hunt",
    description: "Zero-knowledge geolocation gaming on Sui",
  },
  manifest: "/manifest.json",
};

function EnvironmentCheck({ children }: { children: React.ReactNode }) {
  const envResult = validateEnvironment();

  if (!envResult.isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
              <span className="text-4xl">⚙️</span>
            </div>
          </div>

          <h1 className="text-2xl font-black text-orange-400 mb-4 drop-shadow-[0_0_10px_rgba(251,146,60,0.8)]">
            Configuration Error
          </h1>

          <p className="text-gray-400 mb-4">
            Required environment variables are missing:
          </p>

          <ul className="text-left bg-black/50 rounded-lg p-4 mb-6 space-y-2">
            {envResult.missing.map((varName) => (
              <li key={varName} className="text-red-400 font-mono text-sm">
                ❌ {varName}
              </li>
            ))}
          </ul>

          {envResult.warnings.length > 0 && (
            <>
              <p className="text-gray-400 mb-2 text-sm">Warnings:</p>
              <ul className="text-left bg-black/50 rounded-lg p-4 mb-6 space-y-2">
                {envResult.warnings.map((warning, i) => (
                  <li key={i} className="text-yellow-400 font-mono text-xs">
                    ⚠️ {warning}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="text-xs text-gray-500">
            Please check your <code className="bg-gray-800 px-2 py-1 rounded">.env.local</code> file.
            <br />
            See <code className="bg-gray-800 px-2 py-1 rounded">env.example</code> for reference.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <EnvironmentCheck>
            <Providers>{children}</Providers>
          </EnvironmentCheck>
        </ErrorBoundary>
      </body>
    </html>
  );
}
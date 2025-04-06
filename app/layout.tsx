"use client";

import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  // Use effect runs only on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <html lang="en">
      <head>
        <title>OpenBrew | TEA Protocol</title>
        <meta
          name="description"
          content="Collect KYC verified addresses for TEA Protocol"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning={true}>
        {isClient ? (
          children
        ) : (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="text-primary text-sm">
                Loading OpenBrew | TEA Protocol...
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}

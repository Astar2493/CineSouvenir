import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import EnTete from "@/components/EnTete";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "CinéSouvenir",
  description: "Retrouvez un film à partir de vos souvenirs grâce à l'IA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <EnTete />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

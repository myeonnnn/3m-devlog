import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { TerminalTitlebar } from "@/components/terminal-titlebar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3분 개발 로그",
  description: "오늘 배운 점과 해결한 버그를 3분 만에 기록하는 개발 로그",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TerminalTitlebar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

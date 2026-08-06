import "./globals.css";

export const metadata = {
  title: "Wedding Planner",
  description: "우리의 결혼 준비 플래너",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

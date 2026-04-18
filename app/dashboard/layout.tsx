import { Playfair_Display } from "next/font/google"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable}>{children}</div>
}

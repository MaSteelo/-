import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '보건환경연구원 공용차량 배차',
  description: '보건환경연구원 공용차량 배차 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

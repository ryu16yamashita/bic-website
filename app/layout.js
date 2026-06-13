import './globals.css'

export const metadata = {
  title: 'Hoop Runs',
  description: 'Organise your basketball runs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f8f6]">
        {children}
      </body>
    </html>
  )
}

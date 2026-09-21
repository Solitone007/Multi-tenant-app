import './globals.css'

export const metadata = {
  title: 'Sas app',
  description: 'sas is the best'
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  
  return (
   <html lang='en'>
    <body>
      {children}
    </body>
   </html> 
  )
}
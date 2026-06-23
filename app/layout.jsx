import 'react-calendar-timeline/style.css';
import './globals.scss';
import AppProviders from '../src/components/AppProviders';

export const metadata = {
  title: 'ByggExp Admin',
  description: 'ByggExp administration dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

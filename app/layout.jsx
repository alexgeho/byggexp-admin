import 'react-calendar-timeline/style.css';
import './globals.scss';
import AppProviders from '@/src/shared/providers/AppProviders';

export const metadata = {
  title: 'ByggExp Admin',
  description: 'ByggExp administration dashboard',
};

// Set the theme attribute before first paint so dark mode never flashes light.
const themeBootScript = `(function(){try{var m=localStorage.getItem('byggexp.theme');if(m!=='light'&&m!=='dark'){m=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'ISSORKAS — Gestion RH',
  description: 'Application de gestion des ressources humaines',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

import type { MetadataRoute } from 'next';
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoFlow PWA',
    short_name: 'GoFlow',
    description: "Streamline your team's field operations with GoFlow. An intuitive platform for submitting and monitoring calibration reports to ensure accuracy and compliance on the go.",
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#232468ff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
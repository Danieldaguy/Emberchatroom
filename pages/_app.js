// pages/_app.js
import '../styles/globals.css'; // Import the global CSS here

export default function MyApp({ Component, pageProps }) {
    return <Component {...pageProps} />;
}
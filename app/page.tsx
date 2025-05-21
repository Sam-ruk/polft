import { Metadata } from "next";
import App from "@/components/pages/app";
import { APP_URL } from "@/lib/constants";

const frame = {
  version: "next",
  imageUrl: `${APP_URL}/images/feed.png`,
  button: {
    title: "Launch App",
    action: {
      type: "launch_frame",
      name: "PolFT",
      url: `${APP_URL}`,
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#ffffff",
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  let baseUrl: URL;
  try {
    baseUrl = new URL(APP_URL);
  } catch (error) {
    console.error("Invalid APP_URL in page.tsx:", error);
    baseUrl = new URL("https://polft.vercel.app"); // Fallback
  }

  return {
    metadataBase: baseUrl, 
    title: "PolFT",
    description: "Turn memes into soulbound NFTs which can be minted to access token-gated polls.",
    openGraph: {
      title: "PolFT",
      description: "Turn memes into soulbound NFTs which can be minted to access token-gated polls.",
      url: APP_URL,
      siteName: "PolFT",
      type: "website",
      images: [
        {
          url: "/images/feed.png", 
          width: 1200,
          height: 800,
          alt: "PolFT Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "PolFT",
      description: "Turn memes into soulbound NFTs which can be minted to access token-gated polls.",
      images: ["/images/feed.png"], 
    },
    other: {
      "fc:frame": JSON.stringify(frame), // Farcaster embed
    },
  };
}

export default function Home() {
  return <App />;
}
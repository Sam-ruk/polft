import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    "accountAssociation": {
    "header": "eyJmaWQiOjEwODQ4MzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg2QTQzYjdlMkRiMzEwODE3NjUzRDZhQkUyMzE5ODZBM0MxQ0MzMDMyIn0",
    "payload": "eyJkb21haW4iOiJwb2xmdC52ZXJjZWwuYXBwIn0",
    "signature": "MHg2Y2E0YTdiMjZmNWE5NDkwMGE1ZTI2OGZmNjE3YThhNzE4Y2U2NTA5NmJmODc4Zjg0YjZhN2M2NGYwYTliYTk3NWZjN2ZiNjc2NzM3OGIxMGE0OGUxYTJkN2Q3YWM0ZDkzNTY0NjY3OGM3NGU0M2RmZDFkYTU3YjhiMDhhY2FmYTFi"
  },
    frame: {
      version: "1",
      name: "PolFT",
      iconUrl: `${APP_URL}/images/icon.png`,
      homeUrl: `${APP_URL}`,
      imageUrl: `${APP_URL}/images/feed.png`,
      screenshotUrls: [],
      tags: ["monad", "farcaster", "miniapp", "meme", "NFT"],
      primaryCategory: "developer-tools",
      buttonTitle: "Launch App",
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: "#ffffff",
      webhookUrl: `${APP_URL}/api/webhook`,
    },
  };

  return NextResponse.json(farcasterConfig);
}

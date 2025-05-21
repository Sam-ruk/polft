import { NextResponse } from "next/server";
import { APP_URL } from "../../../lib/constants";

export async function GET() {
  const farcasterConfig = {
    "accountAssociation": {
    "header": "eyJmaWQiOjEwODQ4MzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg2QTQzYjdlMkRiMzEwODE3NjUzRDZhQkUyMzE5ODZBM0MxQ0MzMDMyIn0",
    "payload": "eyJkb21haW4iOiJ0cnVuay1jaGlwcy1hbW91bnQtYmUudHJ5Y2xvdWRmbGFyZS5jb20ifQ",
    "signature": "MHgzMWQwZTFhMmM2MWE1NTk4MTliZGFiOGQwNjBjYmVmM2Y2NmRhODliYWUxMzc2ZjAxMmRlMmZkZGM5N2I2MDk5NmQ3YWFjZTNlNGJkMmZlMTRmODdjZDJlMGRlZGUxZjk0YjBhNDFiNWM4OWQwNmExZjJhNDI0OTQwNWRkNWE2ZjFi"
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
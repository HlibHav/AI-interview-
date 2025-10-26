import { NextResponse } from "next/server";
import BeyondPresence from "@bey-dev/sdk";

export async function GET() {
  try {
    if (!process.env.BEY_API_KEY) {
      return NextResponse.json(
        { valid: false, error: "BEY_API_KEY not set" },
        { status: 500 }
      );
    }

    if (!process.env.BEY_AVATAR_ID) {
      return NextResponse.json(
        { valid: false, error: "BEY_AVATAR_ID not set" },
        { status: 500 }
      );
    }

    const bey = new BeyondPresence({
      apiKey: process.env.BEY_API_KEY,
    });

    // Test API key by listing avatars or fetching the specific avatar
    // This validates both the API key and avatar ID
    const response = await fetch(
      `https://api.bey.dev/v1/avatars/${process.env.BEY_AVATAR_ID}`,
      {
        headers: {
          'X-API-Key': process.env.BEY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          valid: false,
          error: `Beyond Presence API returned ${response.status}: ${errorText}`,
          hint: response.status === 401 
            ? "Invalid BEY_API_KEY" 
            : response.status === 404 
            ? "Invalid BEY_AVATAR_ID" 
            : "Unknown error",
        },
        { status: 200 }
      );
    }

    const avatar = await response.json();

    return NextResponse.json({
      valid: true,
      avatar: {
        id: avatar.id,
        name: avatar.name,
      },
      message: "Credentials are valid",
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { getRecommendationsForUserRatings } from "@/lib/recommender";

type RecommendationRequest = {
  ratings?: Record<string, number>;
};

export async function POST(request: Request) {
  let payload: RecommendationRequest;

  try {
    payload = (await request.json()) as RecommendationRequest;
  } catch {
    return NextResponse.json(
      { error: "Submit valid JSON with a ratings object." },
      { status: 400 },
    );
  }

  try {
    const recommendations = await getRecommendationsForUserRatings(
      payload.ratings ?? {},
    );

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build recommendations.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

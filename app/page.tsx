import { RecommenderApp } from "@/components/recommender-app";
import { getItemsToRate } from "@/lib/recommender";

export const revalidate = false;

export default async function HomePage() {
  const itemsToRate = await getItemsToRate();

  return <RecommenderApp itemsToRate={itemsToRate} />;
}

"use client";

import Image from "next/image";
import { useState, useTransition, type CSSProperties } from "react";
import {
  ArrowRight,
  Clapperboard,
  Gauge,
  Play,
  RefreshCcw,
  Sparkles,
  Star,
  TvMinimalPlay,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MovieCard, RecommendationResult } from "@/lib/types";

type RecommenderAppProps = {
  itemsToRate: MovieCard[];
};

type RecommendationResponse = {
  recommendations?: RecommendationResult[];
  error?: string;
};

type ResultSort = "score" | "runtime" | "year";

const minimumRatings = 5;
const ratingOptions = Array.from({ length: 11 }, (_, index) =>
  String(10 - index),
);

export function RecommenderApp({ itemsToRate }: RecommenderAppProps) {
  const [activeTab, setActiveTab] = useState("queue");
  const [resultSort, setResultSort] = useState<ResultSort>("score");
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<
    RecommendationResult[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedMovies = itemsToRate.filter((movie) => ratings[movie.id]);
  const selectedCount = selectedMovies.length;
  const completionPercent = Math.round(
    (selectedCount / itemsToRate.length) * 100,
  );
  const remainingCount = Math.max(minimumRatings - selectedCount, 0);
  const averageSelectedScore =
    selectedCount === 0
      ? null
      : selectedMovies.reduce(
          (total, movie) => total + Number(ratings[movie.id]),
          0,
        ) / selectedCount;

  const defaultSpotlightMovie =
    itemsToRate.find((movie) => movie.title === "Gravity") ?? itemsToRate[0];
  const spotlightMovie = recommendations[0]?.movie ?? defaultSpotlightMovie;
  const spotlightScore = recommendations[0]?.score ?? null;

  const sortedRecommendations = [...recommendations].sort((left, right) => {
    if (resultSort === "runtime") {
      return left.movie.minutes - right.movie.minutes;
    }

    if (resultSort === "year") {
      return right.movie.year - left.movie.year;
    }

    return right.score - left.score;
  });

  const highlightedRecommendations = sortedRecommendations.slice(0, 3);

  const handleRatingChange = (movieId: string, value: string) => {
    setRatings((current) => ({
      ...current,
      [movieId]: value,
    }));
  };

  const handleReset = () => {
    setRatings({});
    setRecommendations([]);
    setErrorMessage(null);
    setHasSubmitted(false);
    setActiveTab("queue");
    setResultSort("score");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const normalizedRatings = Object.fromEntries(
      Object.entries(ratings)
        .filter(([, rating]) => rating !== "")
        .map(([movieId, rating]) => [movieId, Number(rating)]),
    );

    if (Object.keys(normalizedRatings).length < minimumRatings) {
      setRecommendations([]);
      setErrorMessage(
        `Rate at least ${minimumRatings} movies before generating recommendations.`,
      );
      setActiveTab("queue");
      return;
    }

    setActiveTab("results");

    startTransition(() => {
      void submitRatings(normalizedRatings);
    });
  };

  const submitRatings = async (normalizedRatings: Record<string, number>) => {
    setErrorMessage(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ratings: normalizedRatings,
        }),
      });

      const data = (await response.json()) as RecommendationResponse;

      if (!response.ok || data.error) {
        setRecommendations([]);
        setErrorMessage(data.error ?? "Unable to generate recommendations.");
        setActiveTab("results");
        return;
      }

      setRecommendations(data.recommendations ?? []);
      setActiveTab("results");
    } catch {
      setRecommendations([]);
      setErrorMessage("The recommendation request failed. Try again.");
      setActiveTab("results");
    }
  };

  return (
    <main className="relative mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-8 overflow-x-clip px-4 py-6 pb-12 sm:px-6 lg:px-8">
      <Card className="relative overflow-hidden border-border/70 bg-card py-0 shadow-xl shadow-black/8 dark:shadow-black/35">
        <div className="absolute inset-0">
          <Image
            alt={`${spotlightMovie.title} poster`}
            className="object-cover object-top opacity-8 dark:opacity-24"
            fill
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = spotlightMovie.fallbackPosterUrl;
            }}
            priority
            sizes="100vw"
            src={spotlightMovie.posterUrl}
          />
          <div className="absolute inset-0 bg-background/92" />
        </div>

        <div className="relative grid gap-8 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)] lg:p-8">
          <div className="min-w-0 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary">
                  Stream Profile
                </Badge>
                <Badge
                  className="border-border bg-background/70 text-muted-foreground"
                  variant="outline"
                >
                  {itemsToRate.length} titles in queue
                </Badge>
              </div>
              <ThemeToggle />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/85">
                {spotlightScore === null
                  ? "Tonight's calibration lead"
                  : "Tonight's top match"}
              </p>
              <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-none tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Rate your queue like a streaming profile pass.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Score a few titles and the engine will pull a ranked watchlist
                from viewers with the closest taste signature. Browse and rate
                the full lineup from the queue, then switch to ranked matches
                once the profile has enough signal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="bg-primary text-primary-foreground">
                <a
                  href={recommendations.length > 0 ? "#results-panel" : "#queue-rail"}
                >
                  <Play className="size-4" />
                  {recommendations.length > 0
                    ? "Open top picks"
                    : "Start rating queue"}
                </a>
              </Button>
              <Button
                className="border-border bg-background/70 text-foreground hover:bg-muted"
                onClick={handleReset}
                type="button"
                variant="outline"
              >
                <RefreshCcw className="size-4" />
                Reset session
              </Button>
            </div>

            <div className="grid gap-3 pt-3 sm:grid-cols-3">
              <MetricCard
                icon={<Gauge className="size-4 text-primary" />}
                label="Signal strength"
                value={`${completionPercent}%`}
              />
              <MetricCard
                icon={<Star className="size-4 text-[var(--color-stream-gold)]" />}
                label="Average score"
                value={
                  averageSelectedScore === null
                    ? "Not set"
                    : `${averageSelectedScore.toFixed(1)} / 10`
                }
              />
              <MetricCard
                icon={<Sparkles className="size-4 text-[var(--color-stream-cyan)]" />}
                label="Matches ready"
                value={hasSubmitted ? String(recommendations.length) : "Pending"}
              />
            </div>
          </div>

          <div className="min-w-0 grid gap-4">
            <Card className="border-border bg-background/78 py-0 shadow-sm">
              <CardHeader className="border-b border-border px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Featured in your queue</CardTitle>
                    <CardDescription>
                      {spotlightMovie.year} / {spotlightMovie.minutes} min /{" "}
                      {spotlightMovie.country}
                    </CardDescription>
                  </div>
                  <Badge className="bg-muted text-foreground" variant="secondary">
                    {spotlightScore === null
                      ? "Queue lead"
                      : `${spotlightScore.toFixed(2)} score`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-start gap-4 px-5 py-5">
                <PosterThumb movie={spotlightMovie} />
                <div className="space-y-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
                      {spotlightMovie.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {spotlightMovie.director}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getGenreTokens(spotlightMovie.genres).map((genre) => (
                      <Badge
                        className="border-border bg-muted/60 text-foreground"
                        key={genre}
                        variant="outline"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/35 py-0 shadow-sm">
              <CardHeader className="px-5 pt-5">
                <CardTitle>Calibration progress</CardTitle>
                <CardDescription>
                  You need at least {minimumRatings} ratings before the match
                  model starts recommending.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedCount} selected</span>
                  <span>{remainingCount} remaining to unlock</span>
                </div>
                <Progress className="h-2 bg-muted" value={completionPercent} />
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>

      <Tabs
        className="min-w-0 gap-6"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
              Watchlist console
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              Streaming rails for your taste profile.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Rate titles on the queue rail, then switch to the results rail for
              ranked matches and a sortable recommendation board.
            </p>
          </div>
          <TabsList className="border border-border bg-muted/60 p-1" variant="line">
            <TabsTrigger
              className="gap-2 px-4 text-muted-foreground data-active:text-foreground"
              value="queue"
            >
              <Clapperboard className="size-4" />
              Queue rail
            </TabsTrigger>
            <TabsTrigger
              className="gap-2 px-4 text-muted-foreground data-active:text-foreground"
              value="results"
            >
              <TvMinimalPlay className="size-4" />
              Results rail
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent className="min-w-0 space-y-6" value="queue">
          <form className="min-w-0" onSubmit={handleSubmit}>
            <Card
              className="min-w-0 overflow-hidden border-border bg-card py-0 shadow-lg shadow-black/6 dark:shadow-black/20"
              id="queue-rail"
            >
              <CardHeader className="border-b border-border px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Queue rail</CardTitle>
                    <CardDescription>
                      Rate the full queue in a poster-first layout without
                      leaving the page.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-muted text-foreground" variant="secondary">
                      {selectedCount} rated
                    </Badge>
                    <Badge className="bg-primary/10 text-primary" variant="secondary">
                      {minimumRatings} needed
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 px-5 py-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {itemsToRate.map((movie) => {
                      const selectedValue = ratings[movie.id] ?? "";

                      return (
                        <Card
                          className="group/movie relative flex h-full min-w-0 flex-col overflow-hidden border-border bg-background py-0 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/25"
                          key={movie.id}
                        >
                          <div className="relative aspect-[4/5] overflow-hidden rounded-t-xl bg-muted">
                            <Image
                              alt={`${movie.title} poster`}
                              className="object-cover transition duration-500 ease-out group-hover/movie:scale-[1.03]"
                              fill
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = movie.fallbackPosterUrl;
                              }}
                              sizes="252px"
                              src={movie.posterUrl}
                            />
                            <div className="absolute inset-x-0 bottom-0 translate-y-4 px-4 pb-4 opacity-0 transition duration-300 ease-out group-hover/movie:translate-y-0 group-hover/movie:opacity-100">
                              <div className="rounded-2xl border border-border bg-background/92 p-3 shadow-sm backdrop-blur-sm">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                                  Quick preview
                                </p>
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                  {movie.country} production, directed by{" "}
                                  {movie.director}.
                                </p>
                              </div>
                            </div>
                            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                              <Badge className="bg-background/90 text-foreground">
                                {movie.year}
                              </Badge>
                              <Badge
                                className="border-border bg-background/80 text-foreground"
                                variant="outline"
                              >
                                {movie.minutes} min
                              </Badge>
                            </div>
                          </div>
                          <CardHeader className="flex min-h-[9.5rem] flex-col gap-3 px-4 py-4">
                            <div className="min-h-[3.75rem] space-y-2">
                              <CardTitle>{movie.title}</CardTitle>
                              <CardDescription className="line-clamp-2">
                                {movie.director}
                              </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getGenreTokens(movie.genres).map((genre) => (
                                <Badge
                                  className="border-border bg-muted/60 text-foreground"
                                  key={genre}
                                  variant="outline"
                                >
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </CardHeader>
                          <CardContent className="mt-auto flex flex-1 flex-col justify-end gap-3 px-4 pb-4">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                              <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                Your rating
                              </span>
                              <span className="truncate text-right text-xs text-muted-foreground">
                                {movie.country}
                              </span>
                            </div>
                            <Select
                              onValueChange={(value) =>
                                handleRatingChange(
                                  movie.id,
                                  value === "none" ? "" : value,
                                )
                              }
                              value={selectedValue === "" ? "none" : selectedValue}
                            >
                              <SelectTrigger className="w-full min-w-0 justify-between border-border bg-background text-foreground">
                                <SelectValue placeholder="Not rated" />
                              </SelectTrigger>
                              <SelectContent
                                className="max-h-[26rem]"
                                position="popper"
                                sideOffset={6}
                              >
                                <SelectItem value="none">Not rated</SelectItem>
                                {ratingOptions.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value} / 10
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {remainingCount === 0
                      ? "Queue calibrated enough for recommendations."
                      : `${remainingCount} more rating${remainingCount === 1 ? "" : "s"} needed to unlock recommendations.`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submit when you are happy with the taste signal. You can
                    still come back and re-rate after seeing the results rail.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button
                    className="border-border bg-background text-foreground hover:bg-muted"
                    onClick={handleReset}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcw className="size-4" />
                    Clear queue
                  </Button>
                  <Button
                    className="bg-primary text-primary-foreground"
                    disabled={isPending}
                    type="submit"
                  >
                    {isPending ? "Building your rail..." : "Generate recommendations"}
                    {!isPending && <ArrowRight className="size-4" />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
        <TabsContent className="min-w-0 space-y-6" value="results">
          <Card
            className="cinematic-panel min-w-0 overflow-hidden border-border bg-card py-0 shadow-lg shadow-black/6 dark:shadow-black/20"
            id="results-panel"
          >
            <CardHeader className="gap-4 border-b border-border px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Results rail</CardTitle>
                  <CardDescription>
                    Top matches are ranked with the same similarity-weighted
                    engine, then displayed in a sortable watchlist board.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    onValueChange={(value) => setResultSort(value as ResultSort)}
                    value={resultSort}
                  >
                    <SelectTrigger className="w-[180px] border-border bg-background text-foreground">
                      <SelectValue placeholder="Sort results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Sort by score</SelectItem>
                      <SelectItem value="runtime">Sort by runtime</SelectItem>
                      <SelectItem value="year">Sort by year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-5 py-5">
              {isPending ? (
                <LoadingResults />
              ) : errorMessage ? (
                <EmptyState
                  description={errorMessage}
                  title="The rail could not be generated"
                />
              ) : !hasSubmitted ? (
                <EmptyState
                  description="Submit your queue ratings and the results rail will populate with ranked matches."
                  title="No results yet"
                />
              ) : sortedRecommendations.length === 0 ? (
                <EmptyState
                  description="No recommendations met the minimum matching threshold for this rating set. Try rating more movies or adjusting the scores."
                  title="No matches crossed the threshold"
                />
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-3" id="results-grid">
                    {highlightedRecommendations.map((recommendation, index) => (
                      <Card
                        className="cinematic-rise group/result overflow-hidden border-border bg-background py-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-black/8 dark:hover:shadow-black/25"
                        key={recommendation.movie.id}
                        style={getStaggerStyle(index)}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-muted">
                          <Image
                            alt={`${recommendation.movie.title} poster`}
                            className="object-cover object-top transition duration-500 ease-out group-hover/result:scale-[1.03]"
                            fill
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src =
                                recommendation.movie.fallbackPosterUrl;
                            }}
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            src={recommendation.movie.posterUrl}
                          />
                          <div className="absolute inset-0 bg-background/12 opacity-0 transition duration-300 group-hover/result:opacity-100" />
                          <div className="absolute left-4 top-4 flex items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground">
                              #{index + 1}
                            </Badge>
                            <Badge
                              className="border-border bg-background/88 text-foreground"
                              variant="outline"
                            >
                              {recommendation.score.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="space-y-3 px-4 py-4">
                          <CardTitle>{recommendation.movie.title}</CardTitle>
                          <CardDescription>
                            {recommendation.movie.year} /{" "}
                            {recommendation.movie.director}
                          </CardDescription>
                          <div className="flex flex-wrap gap-2">
                            {getGenreTokens(recommendation.movie.genres).map(
                              (genre) => (
                                <Badge
                                  className="border-border bg-muted/60 text-foreground"
                                  key={genre}
                                  variant="outline"
                                >
                                  {genre}
                                </Badge>
                              ),
                            )}
                          </div>
                        </CardHeader>
                        <CardFooter className="justify-between border-t border-border bg-muted/35 px-4 py-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {recommendation.movie.minutes} min /{" "}
                            {recommendation.movie.country}
                          </div>
                          <Button asChild size="sm">
                            <a
                              href={recommendation.imdbUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open IMDb
                            </a>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>

                  <Separator className="bg-border" />

                  <div
                    className="cinematic-rise min-w-0 rounded-3xl border border-border bg-background/70 p-3"
                    style={getStaggerStyle(3)}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Rank</TableHead>
                          <TableHead className="text-muted-foreground">Title</TableHead>
                          <TableHead className="text-muted-foreground">
                            Profile fit
                          </TableHead>
                          <TableHead className="text-right text-muted-foreground">
                            Score
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedRecommendations.map((recommendation, index) => (
                          <TableRow
                            className="cinematic-row border-border hover:bg-muted/40"
                            key={recommendation.movie.id}
                            style={getStaggerStyle(index + 4)}
                          >
                            <TableCell className="align-top">
                              <Badge className="bg-muted text-foreground" variant="secondary">
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[270px] align-top">
                              <div className="flex items-start gap-3">
                                <PosterThumb movie={recommendation.movie} size="sm" />
                                <div className="min-w-0 space-y-2">
                                  <div>
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {recommendation.movie.title}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {recommendation.movie.year} /{" "}
                                      {recommendation.movie.country}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {getGenreTokens(
                                      recommendation.movie.genres,
                                    ).map((genre) => (
                                      <Badge
                                        className="border-border bg-muted/55 text-foreground"
                                        key={genre}
                                        variant="outline"
                                      >
                                        {genre}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[260px] align-top text-sm text-muted-foreground">
                              <div className="space-y-1">
                                <p>{recommendation.movie.director}</p>
                                <p>{recommendation.movie.minutes} min runtime</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top text-sm font-semibold text-primary">
                              {recommendation.score.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
      <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
        {value}
      </p>
    </div>
  );
}

function PosterThumb({
  movie,
  size = "default",
}: {
  movie: MovieCard;
  size?: "default" | "sm";
}) {
  const dimensions =
    size === "sm"
      ? "h-[72px] w-[52px] rounded-xl"
      : "h-[128px] w-[92px] rounded-2xl";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-border bg-muted ${dimensions}`}
    >
      <Image
        alt={`${movie.title} poster`}
        className="object-cover"
        fill
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = movie.fallbackPosterUrl;
        }}
        sizes={size === "sm" ? "52px" : "92px"}
        src={movie.posterUrl}
      />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/25 p-8 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Sparkles className="size-5 text-primary" />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function LoadingResults() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card className="border-border bg-background py-0" key={index}>
            <Skeleton className="aspect-[16/10] rounded-t-xl rounded-b-none bg-muted" />
            <CardHeader className="space-y-3 px-4 py-4">
              <Skeleton className="h-5 w-2/3 bg-muted" />
              <Skeleton className="h-4 w-1/2 bg-muted" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full bg-muted" />
                <Skeleton className="h-5 w-20 rounded-full bg-muted" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="space-y-3 rounded-3xl border border-border bg-muted/25 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="flex items-center gap-4 rounded-2xl border border-border p-3"
            key={index}
          >
            <Skeleton className="h-[72px] w-[52px] rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5 bg-muted" />
              <Skeleton className="h-4 w-1/3 bg-muted" />
            </div>
            <Skeleton className="h-4 w-14 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getStaggerStyle(index: number): CSSProperties {
  return {
    animationDelay: `${index * 110}ms`,
  };
}

function getGenreTokens(genres: string) {
  return genres
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 2);
}

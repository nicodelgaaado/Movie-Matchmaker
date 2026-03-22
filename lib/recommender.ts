import path from "node:path";

import { readCsvRows } from "@/lib/csv";
import type {
  Movie,
  MovieCard,
  Rater,
  RatingValue,
  RecommendationResult,
} from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const movieFile = path.join(dataDirectory, "ratedmoviesfull.csv");
const ratingsFile = path.join(dataDirectory, "ratings.csv");

const itemsToRateCount = 12;
const minimumSubmittedRatings = 5;
const minimalRaters = 5;
const similarRaters = 20;
const maximumRecommendations = 10;
const posterOverrides = new Map<string, string>([
  [
    "1690953",
    "https://upload.wikimedia.org/wikipedia/en/2/29/Despicable_Me_2_poster.jpg",
  ],
]);

type Dataset = {
  moviesById: Map<string, Movie>;
  movieIds: string[];
  ratersById: Map<string, Rater>;
  raters: Rater[];
};

let datasetPromise: Promise<Dataset> | undefined;

export async function getItemsToRate() {
  const dataset = await loadDataset();
  const candidates = getAverageRatingsByFilter(
    dataset,
    50,
    (movie) => movie.year >= 1980 && movie.minutes >= 80 && movie.minutes <= 180,
  ).sort((left, right) => compareRatingsDescending(left, right));

  const selectedIds: string[] = [];
  const primaryDirectors = new Set<string>();

  for (const candidate of candidates) {
    const movie = dataset.moviesById.get(candidate.item);

    if (!movie) {
      continue;
    }

    const primaryDirector = movie.director.split(",")[0]?.trim() ?? "";

    if (selectedIds.length < 6 || !primaryDirectors.has(primaryDirector)) {
      selectedIds.push(movie.id);
      primaryDirectors.add(primaryDirector);
    }

    if (selectedIds.length === itemsToRateCount) {
      return selectedIds.map((movieId) =>
        toMovieCard(dataset.moviesById.get(movieId)!),
      );
    }
  }

  for (const movieId of dataset.movieIds) {
    if (!selectedIds.includes(movieId)) {
      selectedIds.push(movieId);
    }

    if (selectedIds.length === itemsToRateCount) {
      break;
    }
  }

  return selectedIds.map((movieId) => toMovieCard(dataset.moviesById.get(movieId)!));
}

export async function getRecommendationsForUserRatings(
  submittedRatings: Record<string, number>,
) {
  const dataset = await loadDataset();
  const normalizedRatings = Object.entries(submittedRatings).reduce<
    Map<string, number>
  >((ratings, [movieId, rating]) => {
    if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
      throw new Error("Ratings must be whole numbers between 0 and 10.");
    }

    if (!dataset.moviesById.has(movieId)) {
      throw new Error(`Unknown movie id: ${movieId}`);
    }

    ratings.set(movieId, rating);
    return ratings;
  }, new Map<string, number>());

  if (normalizedRatings.size < minimumSubmittedRatings) {
    throw new Error(
      `Submit at least ${minimumSubmittedRatings} ratings so the recommender has enough signal to compare your taste profile.`,
    );
  }

  const userRater: Rater = {
    id: "web-user",
    ratings: normalizedRatings,
  };

  const raters = [...dataset.raters, userRater];
  const ratersById = new Map(dataset.ratersById);
  ratersById.set(userRater.id, userRater);

  const rawRecommendations = getSimilarRatingsByFilter(
    dataset.movieIds,
    raters,
    ratersById,
    userRater.id,
    similarRaters,
    minimalRaters,
  );

  const recommendations: RecommendationResult[] = [];

  for (const recommendation of rawRecommendations) {
    if (normalizedRatings.has(recommendation.item)) {
      continue;
    }

    const movie = dataset.moviesById.get(recommendation.item);

    if (!movie) {
      continue;
    }

    recommendations.push({
      movie: toMovieCard(movie),
      score: recommendation.value,
      imdbUrl: `https://www.imdb.com/title/tt${movie.id}`,
    });

    if (recommendations.length === maximumRecommendations) {
      break;
    }
  }

  return recommendations;
}

async function loadDataset() {
  datasetPromise ??= buildDataset();
  return datasetPromise;
}

async function buildDataset(): Promise<Dataset> {
  const [movieRows, ratingRows] = await Promise.all([
    readCsvRows(movieFile),
    readCsvRows(ratingsFile),
  ]);

  const movies = movieRows.map<Movie>((row) => ({
    id: row.id,
    title: row.title,
    year: Number.parseInt(row.year, 10),
    country: row.country,
    genres: row.genre,
    director: row.director,
    minutes: Number.parseInt(row.minutes, 10),
    poster: row.poster,
  }));

  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const ratersById = new Map<string, Rater>();

  for (const row of ratingRows) {
    const raterId = row.rater_id;
    const movieId = row.movie_id;
    const rating = Number.parseFloat(row.rating);

    let rater = ratersById.get(raterId);

    if (!rater) {
      rater = {
        id: raterId,
        ratings: new Map<string, number>(),
      };
      ratersById.set(raterId, rater);
    }

    rater.ratings.set(movieId, rating);
  }

  return {
    moviesById,
    movieIds: movies.map((movie) => movie.id),
    ratersById,
    raters: Array.from(ratersById.values()),
  };
}

function getAverageRatingsByFilter(
  dataset: Dataset,
  minRaters: number,
  predicate: (movie: Movie) => boolean,
) {
  const averages: RatingValue[] = [];

  for (const movieId of dataset.movieIds) {
    const movie = dataset.moviesById.get(movieId);

    if (!movie || !predicate(movie)) {
      continue;
    }

    const average = getAverageByMovieId(dataset.raters, movieId, minRaters);

    if (average > 0) {
      averages.push({
        item: movieId,
        value: average,
      });
    }
  }

  return averages;
}

function getAverageByMovieId(raters: Rater[], movieId: string, minRaters: number) {
  let total = 0;
  let ratingsCount = 0;

  for (const rater of raters) {
    const rating = rater.ratings.get(movieId);

    if (rating === undefined) {
      continue;
    }

    total += rating;
    ratingsCount += 1;
  }

  if (ratingsCount < minRaters) {
    return 0;
  }

  return total / ratingsCount;
}

function getSimilarRatingsByFilter(
  movieIds: string[],
  raters: Rater[],
  ratersById: Map<string, Rater>,
  targetRaterId: string,
  numberOfSimilarRaters: number,
  minRaters: number,
) {
  const similarities = getSimilarities(targetRaterId, raters)
    .filter((rating) => rating.value > 0)
    .sort((left, right) => compareRatingsDescending(left, right))
    .slice(0, numberOfSimilarRaters);

  if (similarities.length === 0) {
    return [];
  }

  const weightedRatings: RatingValue[] = [];

  for (const movieId of movieIds) {
    const weightedAverage = getWeightedAverage(
      movieId,
      similarities,
      ratersById,
      minRaters,
    );

    if (weightedAverage > 0) {
      weightedRatings.push({
        item: movieId,
        value: weightedAverage,
      });
    }
  }

  return weightedRatings.sort((left, right) => compareRatingsDescending(left, right));
}

function getSimilarities(targetRaterId: string, raters: Rater[]) {
  const targetRater = raters.find((rater) => rater.id === targetRaterId);

  if (!targetRater) {
    return [];
  }

  const similarities: RatingValue[] = [];

  for (const otherRater of raters) {
    if (otherRater.id === targetRaterId) {
      continue;
    }

    const similarity = dotProduct(targetRater, otherRater);

    if (similarity > 0) {
      similarities.push({
        item: otherRater.id,
        value: similarity,
      });
    }
  }

  return similarities;
}

function dotProduct(targetRater: Rater, otherRater: Rater) {
  let total = 0;

  for (const [movieId, rating] of targetRater.ratings.entries()) {
    const otherRating = otherRater.ratings.get(movieId);

    if (otherRating === undefined) {
      continue;
    }

    total += (rating - 5) * (otherRating - 5);
  }

  return total;
}

function getWeightedAverage(
  movieId: string,
  similarities: RatingValue[],
  ratersById: Map<string, Rater>,
  minRaters: number,
) {
  let total = 0;
  let ratingsCount = 0;

  for (const similarityRating of similarities) {
    const similarRater = ratersById.get(similarityRating.item);
    const movieRating = similarRater?.ratings.get(movieId);

    if (movieRating === undefined) {
      continue;
    }

    total += similarityRating.value * movieRating;
    ratingsCount += 1;
  }

  if (ratingsCount < minRaters) {
    return 0;
  }

  return total / ratingsCount;
}

function compareRatingsDescending(left: RatingValue, right: RatingValue) {
  if (right.value !== left.value) {
    return right.value - left.value;
  }

  return left.item.localeCompare(right.item);
}

function toMovieCard(movie: Movie): MovieCard {
  return {
    ...movie,
    posterUrl: getPosterUrl(movie),
    fallbackPosterUrl: createPosterFallback(movie.title),
  };
}

function getPosterUrl(movie: Movie) {
  const override = posterOverrides.get(movie.id);

  if (override) {
    return override;
  }

  if (!movie.poster || movie.poster === "N/A") {
    return createPosterFallback(movie.title);
  }

  return movie.poster
    .replace("http://ia.media-imdb.com/", "https://m.media-amazon.com/")
    .replace("https://ia.media-imdb.com/", "https://m.media-amazon.com/");
}

function createPosterFallback(title: string) {
  const safeTitle = title.length <= 22 ? title : `${title.slice(0, 19)}...`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='185' height='278' viewBox='0 0 185 278'><rect width='185' height='278' fill='#d7e0ea'/><rect x='12' y='12' width='161' height='254' rx='14' fill='#f8fafc' stroke='#95a4b8'/><text x='92.5' y='120' text-anchor='middle' font-size='18' font-family='Arial, sans-serif' fill='#20445d'>Poster</text><text x='92.5' y='146' text-anchor='middle' font-size='12' font-family='Arial, sans-serif' fill='#466174'>unavailable</text><text x='92.5' y='188' text-anchor='middle' font-size='12' font-family='Arial, sans-serif' fill='#6c8192'>${escapeXml(
    safeTitle,
  )}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

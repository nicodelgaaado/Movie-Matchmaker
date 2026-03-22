export type Movie = {
  id: string;
  title: string;
  year: number;
  country: string;
  genres: string;
  director: string;
  minutes: number;
  poster: string;
};

export type MovieCard = Movie & {
  posterUrl: string;
  fallbackPosterUrl: string;
};

export type RatingValue = {
  item: string;
  value: number;
};

export type Rater = {
  id: string;
  ratings: Map<string, number>;
};

export type RecommendationResult = {
  movie: MovieCard;
  score: number;
  imdbUrl: string;
};

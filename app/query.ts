// TODO: Instead of exporting these types and constants, I should export enums.
export type Sort = 'attention_score' | 'tweets_count';
export type Filter = 'show_retweets' | 'hide_retweets';
export const DEFAULT_FILTER: Filter = 'show_retweets';
export const SORTS: Sort[] = ['attention_score', 'tweets_count'];
export const FILTERS: Filter[] = ['show_retweets', 'hide_retweets'];

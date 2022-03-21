export enum ArticlesSort {
  AttentionScore,
  TweetsCount,
}
export enum ArticlesFilter {
  HideRetweets,
  ShowRetweets,
}
export const DEFAULT_ARTICLE_FILTER = ArticlesFilter.ShowRetweets;
export const DEFAULT_ARTICLE_SORT = ArticlesSort.AttentionScore;
export enum ArticleTweetsSort {
  AttentionScore,
  RetweetCount,
  Latest,
  Earliest,
}
export enum ArticleTweetsFilter {
  HideRetweets,
  ShowRetweets,
}

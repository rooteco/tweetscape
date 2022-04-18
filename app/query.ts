export enum Param {
  ArticlesSort = 'as',
  ArticlesFilter = 'af',
  ArticleTweetsSort = 'ats',
  ArticleTweetsFilter = 'atf',
  TweetsSort = 'ts',
  TweetsFilter = 'tf',
  TweetsLimit = 'tl',
  Time = 't',
}

export enum ArticlesSort {
  AttentionScore,
  TweetCount,
}
export const DEFAULT_ARTICLES_SORT = ArticlesSort.AttentionScore;
export enum ArticlesFilter {
  HideRetweets,
  ShowRetweets,
}
export const DEFAULT_ARTICLES_FILTER = ArticlesFilter.HideRetweets;
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
export const DEFAULT_TWEETS_LIMIT = 50;
export enum TweetsSort {
  TweetCount,
  RetweetCount,
  QuoteCount,
  LikeCount,
  FollowerCount,
  Latest,
  Earliest,
}
export const DEFAULT_TWEETS_SORT = TweetsSort.Latest;
export enum TweetsFilter {
  HideRetweets,
  ShowRetweets,
}
export const DEFAULT_TWEETS_FILTER = TweetsFilter.ShowRetweets;
export enum Time {
  Day,
  Week,
  Month,
  Year,
  Decade,
  Century,
}
export const DEFAULT_TIME = Time.Week;

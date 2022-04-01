-- CreateEnum
CREATE TYPE "annotation_type" AS ENUM ('Person', 'Place', 'Product', 'Organization', 'Other');

-- CreateEnum
CREATE TYPE "ref_type" AS ENUM ('quoted', 'retweeted', 'replied_to');

-- CreateEnum
CREATE TYPE "tag_type" AS ENUM ('cashtag', 'hashtag');

-- CreateTable
CREATE TABLE "annotations" (
    "tweet_id" BIGINT NOT NULL,
    "normalized_text" TEXT NOT NULL,
    "probability" DECIMAL NOT NULL,
    "type" "annotation_type" NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("tweet_id","normalized_text")
);

-- CreateTable
CREATE TABLE "clusters" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencers" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "verified" BOOLEAN,
    "description" TEXT,
    "profile_image_url" TEXT,
    "followers_count" INTEGER,
    "following_count" INTEGER,
    "tweets_count" INTEGER,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "url" TEXT NOT NULL,
    "display_url" TEXT NOT NULL,
    "status" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "unwound_url" TEXT,

    CONSTRAINT "links_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "mentions" (
    "tweet_id" BIGINT NOT NULL,
    "influencer_id" BIGINT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("tweet_id","influencer_id")
);

-- CreateTable
CREATE TABLE "refs" (
    "referenced_tweet_id" BIGINT NOT NULL,
    "referencer_tweet_id" BIGINT NOT NULL,
    "type" "ref_type" NOT NULL,

    CONSTRAINT "refs_pkey" PRIMARY KEY ("referenced_tweet_id","referencer_tweet_id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" BIGINT NOT NULL,
    "influencer_id" BIGINT NOT NULL,
    "cluster_id" BIGINT NOT NULL,
    "attention_score" DECIMAL NOT NULL,
    "attention_score_change_week" DECIMAL,
    "insider_score" DECIMAL NOT NULL,
    "organization_rank" INTEGER,
    "personal_rank" INTEGER,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "tweet_id" BIGINT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" "tag_type" NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("tweet_id","tag","type")
);

-- CreateTable
CREATE TABLE "tweets" (
    "id" BIGINT NOT NULL,
    "author_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "retweet_count" INTEGER NOT NULL,
    "reply_count" INTEGER NOT NULL,
    "like_count" INTEGER NOT NULL,
    "quote_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tweets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "tweet_id" BIGINT NOT NULL,
    "link_url" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("tweet_id","link_url")
);

-- CreateTable
CREATE TABLE "images" (
    "link_url" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("link_url","url","width","height")
);

-- CreateTable
CREATE TABLE "tokens" (
    "influencer_id" BIGINT NOT NULL,
    "token_type" TEXT NOT NULL,
    "expires_in" INTEGER NOT NULL,
    "access_token" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("influencer_id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" BIGINT NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "follower_count" INTEGER NOT NULL,
    "member_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_followers" (
    "influencer_id" BIGINT NOT NULL,
    "list_id" BIGINT NOT NULL,

    CONSTRAINT "list_followers_pkey" PRIMARY KEY ("influencer_id","list_id")
);

-- CreateTable
CREATE TABLE "list_members" (
    "influencer_id" BIGINT NOT NULL,
    "list_id" BIGINT NOT NULL,

    CONSTRAINT "list_members_pkey" PRIMARY KEY ("influencer_id","list_id")
);

-- CreateTable
CREATE TABLE "likes" (
    "tweet_id" BIGINT NOT NULL,
    "influencer_id" BIGINT NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("tweet_id","influencer_id")
);

-- CreateTable
CREATE TABLE "retweets" (
    "tweet_id" BIGINT NOT NULL,
    "influencer_id" BIGINT NOT NULL,

    CONSTRAINT "retweets_pkey" PRIMARY KEY ("tweet_id","influencer_id")
);

-- CreateTable
CREATE TABLE "rekt" (
    "id" BIGINT NOT NULL,
    "influencer_id" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile_image_url" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "followers_count" INTEGER,
    "followers_in_people_count" INTEGER NOT NULL,

    CONSTRAINT "rekt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clusters_name_key" ON "clusters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clusters_slug_key" ON "clusters"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "scores_cluster_id_influencer_id_key" ON "scores"("cluster_id", "influencer_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_cluster_id_rank_key" ON "scores"("cluster_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_access_token_key" ON "tokens"("access_token");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_refresh_token_key" ON "tokens"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "rekt_rank_key" ON "rekt"("rank");

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refs" ADD CONSTRAINT "refs_referenced_tweet_id_fkey" FOREIGN KEY ("referenced_tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refs" ADD CONSTRAINT "refs_referencer_tweet_id_fkey" FOREIGN KEY ("referencer_tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_link_url_fkey" FOREIGN KEY ("link_url") REFERENCES "links"("url") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_link_url_fkey" FOREIGN KEY ("link_url") REFERENCES "links"("url") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_followers" ADD CONSTRAINT "list_followers_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_followers" ADD CONSTRAINT "list_followers_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_members" ADD CONSTRAINT "list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retweets" ADD CONSTRAINT "retweets_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "retweets" ADD CONSTRAINT "retweets_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rekt" ADD CONSTRAINT "rekt_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

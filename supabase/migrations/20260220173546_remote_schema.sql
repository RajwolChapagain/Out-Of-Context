drop view if exists "public"."vote_results";

alter table "public"."votes" drop constraint "votes_pkey";

drop index if exists "public"."votes_pkey";

alter table "public"."games" add column "imposter_win" boolean;

alter table "public"."players" drop column "role";

alter table "public"."players" add column "amount_votes" integer default 0;

alter table "public"."players" add column "name" text;

alter table "public"."votes" drop column "id";

alter table "public"."votes" drop column "round";

alter table "public"."votes" add column "vote_id" uuid not null default gen_random_uuid();

CREATE UNIQUE INDEX votes_pkey ON public.votes USING btree (vote_id);

alter table "public"."votes" add constraint "votes_pkey" PRIMARY KEY using index "votes_pkey";

alter table "public"."votes" add constraint "votes_game_id_fkey" FOREIGN KEY (game_id) REFERENCES public.games(game_id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_game_id_fkey";



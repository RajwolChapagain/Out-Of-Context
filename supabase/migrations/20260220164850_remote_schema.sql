drop extension if exists "pg_net";


  create table "public"."games" (
    "game_id" uuid not null default gen_random_uuid(),
    "status" text,
    "start_time" timestamp without time zone,
    "end_time" timestamp without time zone
      );



  create table "public"."messages" (
    "message_id" uuid not null default gen_random_uuid(),
    "game_id" uuid,
    "sender_id" uuid,
    "content" text,
    "timestamp" timestamp without time zone default now()
      );



  create table "public"."players" (
    "user_id" uuid not null default gen_random_uuid(),
    "game_id" uuid,
    "role" text,
    "joined_at" timestamp without time zone default now(),
    "Imposter" boolean,
    "Human" boolean
      );


alter table "public"."players" enable row level security;


  create table "public"."votes" (
    "id" uuid not null default gen_random_uuid(),
    "voter_id" uuid not null,
    "game_id" uuid not null,
    "voted_for_id" uuid not null,
    "round" integer not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."votes" enable row level security;

CREATE UNIQUE INDEX games_pkey ON public.games USING btree (game_id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (message_id);

CREATE UNIQUE INDEX players_pkey ON public.players USING btree (user_id);

CREATE UNIQUE INDEX votes_pkey ON public.votes USING btree (id);

alter table "public"."games" add constraint "games_pkey" PRIMARY KEY using index "games_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "public"."votes" add constraint "votes_pkey" PRIMARY KEY using index "votes_pkey";

alter table "public"."messages" add constraint "messages_game_id_fkey" FOREIGN KEY (game_id) REFERENCES public.games(game_id) not valid;

alter table "public"."messages" validate constraint "messages_game_id_fkey";

alter table "public"."players" add constraint "players_game_id_fkey" FOREIGN KEY (game_id) REFERENCES public.games(game_id) not valid;

alter table "public"."players" validate constraint "players_game_id_fkey";

alter table "public"."votes" add constraint "votes_voter_id_fkey" FOREIGN KEY (voter_id) REFERENCES auth.users(id) not valid;

alter table "public"."votes" validate constraint "votes_voter_id_fkey";

create or replace view "public"."vote_results" as  SELECT game_id,
    round,
    voted_for_id,
    count(*) AS total_votes
   FROM public.votes
  GROUP BY game_id, round, voted_for_id;


grant delete on table "public"."games" to "anon";

grant insert on table "public"."games" to "anon";

grant references on table "public"."games" to "anon";

grant select on table "public"."games" to "anon";

grant trigger on table "public"."games" to "anon";

grant truncate on table "public"."games" to "anon";

grant update on table "public"."games" to "anon";

grant delete on table "public"."games" to "authenticated";

grant insert on table "public"."games" to "authenticated";

grant references on table "public"."games" to "authenticated";

grant select on table "public"."games" to "authenticated";

grant trigger on table "public"."games" to "authenticated";

grant truncate on table "public"."games" to "authenticated";

grant update on table "public"."games" to "authenticated";

grant delete on table "public"."games" to "service_role";

grant insert on table "public"."games" to "service_role";

grant references on table "public"."games" to "service_role";

grant select on table "public"."games" to "service_role";

grant trigger on table "public"."games" to "service_role";

grant truncate on table "public"."games" to "service_role";

grant update on table "public"."games" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."players" to "anon";

grant insert on table "public"."players" to "anon";

grant references on table "public"."players" to "anon";

grant select on table "public"."players" to "anon";

grant trigger on table "public"."players" to "anon";

grant truncate on table "public"."players" to "anon";

grant update on table "public"."players" to "anon";

grant delete on table "public"."players" to "authenticated";

grant insert on table "public"."players" to "authenticated";

grant references on table "public"."players" to "authenticated";

grant select on table "public"."players" to "authenticated";

grant trigger on table "public"."players" to "authenticated";

grant truncate on table "public"."players" to "authenticated";

grant update on table "public"."players" to "authenticated";

grant delete on table "public"."players" to "service_role";

grant insert on table "public"."players" to "service_role";

grant references on table "public"."players" to "service_role";

grant select on table "public"."players" to "service_role";

grant trigger on table "public"."players" to "service_role";

grant truncate on table "public"."players" to "service_role";

grant update on table "public"."players" to "service_role";

grant delete on table "public"."votes" to "anon";

grant insert on table "public"."votes" to "anon";

grant references on table "public"."votes" to "anon";

grant select on table "public"."votes" to "anon";

grant trigger on table "public"."votes" to "anon";

grant truncate on table "public"."votes" to "anon";

grant update on table "public"."votes" to "anon";

grant delete on table "public"."votes" to "authenticated";

grant insert on table "public"."votes" to "authenticated";

grant references on table "public"."votes" to "authenticated";

grant select on table "public"."votes" to "authenticated";

grant trigger on table "public"."votes" to "authenticated";

grant truncate on table "public"."votes" to "authenticated";

grant update on table "public"."votes" to "authenticated";

grant delete on table "public"."votes" to "service_role";

grant insert on table "public"."votes" to "service_role";

grant references on table "public"."votes" to "service_role";

grant select on table "public"."votes" to "service_role";

grant trigger on table "public"."votes" to "service_role";

grant truncate on table "public"."votes" to "service_role";

grant update on table "public"."votes" to "service_role";


  create policy "Enable read access for all users"
  on "public"."players"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own votes"
  on "public"."votes"
  as permissive
  for insert
  to public
with check ((auth.uid() = voter_id));




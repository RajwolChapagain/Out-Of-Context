import uuid
from django.http import JsonResponse
from .supabase_client import supabase


def health(request):
    return JsonResponse({"status": "ok"})


def join_game(request):
    # Look for an existing waiting game
    game_query = (
        supabase.table("games")
        .select("*")
        .eq("status", "waiting")
        .limit(1)
        .execute()
    )

    # --------------------------------------------------
    # CASE A: No waiting game → create new one
    # --------------------------------------------------
    if not game_query.data:
        game_res = (
            supabase.table("games")
            .insert({"status": "waiting"})
            .execute()
        )

        game_id = game_res.data[0]["game_id"]
        player_number = 1

    # --------------------------------------------------
    # CASE B: Waiting game exists → check player count
    # --------------------------------------------------
    else:
        game_id = game_query.data[0]["game_id"]

        player_count_res = (
            supabase.table("players")
            .select("user_id", count="exact")
            .eq("game_id", game_id)
            .execute()
        )

        player_count = player_count_res.count or 0

        # If already full → create a NEW game instead
        if player_count >= 4:
            game_res = (
                supabase.table("games")
                .insert({"status": "waiting"})
                .execute()
            )

            game_id = game_res.data[0]["game_id"]
            player_number = 1
        else:
            player_number = player_count + 1

    # --------------------------------------------------
    # Insert player into chosen game
    # --------------------------------------------------
    player_id = str(uuid.uuid4())

    supabase.table("players").insert(
        {
            "user_id": player_id,
            "game_id": game_id,
            "role": "human",
        }
    ).execute()

    # --------------------------------------------------
    # If game just reached 4 players → mark active
    # --------------------------------------------------
    if player_number == 4:
        supabase.table("games").update(
            {"status": "active"}
        ).eq("game_id", game_id).execute()

    # --------------------------------------------------
    # Return response
    # --------------------------------------------------
    return JsonResponse(
        {
            "game_id": game_id,
            "your_id": player_id,
            "player_number": player_number,
        }
    )
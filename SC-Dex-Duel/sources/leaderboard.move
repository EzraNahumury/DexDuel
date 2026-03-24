/// Module: leaderboard
/// Manages player scores, rankings, streaks, and season progression
module sc_dex_duel::leaderboard {
    use one::table::{Self, Table};
    use one::event;
    use one::tx_context;
    use one::object;
    use one::transfer;

    const ERR_PLAYER_NOT_FOUND: u64 = 1;
    const ERR_SEASON_NOT_ACTIVE: u64 = 3;

    // ==================== Constants ====================
    const POINTS_WIN: u64 = 10;
    const POINTS_WIN_STREAK: u64 = 5;
    const POINTS_EARLY_PREDICTION: u64 = 3;

    // ==================== Structs ====================

    /// Player statistics
    public struct PlayerStats has store, copy, drop {
        player: address,
        total_score: u64,
        wins: u64,
        losses: u64,
        current_streak: u64,
        best_streak: u64,
        total_rounds_played: u64,
        early_predictions: u64,
        last_round_id: u64,
    }

    /// Leaderboard entry for ranking
    public struct LeaderboardEntry has store, copy, drop {
        player: address,
        score: u64,
        wins: u64,
        streak: u64,
    }

    /// Global leaderboard for a season
    public struct Leaderboard has key, store {
        id: object::UID,
        season_id: u64,
        player_stats: Table<address, PlayerStats>,
        rankings: vector<LeaderboardEntry>, // Sorted by score (descending)
        total_players: u64,
        is_active: bool,
    }

    // ==================== Events ====================

    public struct ScoreUpdated has copy, drop {
        season_id: u64,
        player: address,
        points_earned: u64,
        new_total_score: u64,
        current_streak: u64,
    }

    public struct StreakUpdated has copy, drop {
        player: address,
        new_streak: u64,
        is_broken: bool,
    }

    public struct SeasonEnded has copy, drop {

        season_id: u64,
        total_players: u64,
        winner: address,
        winning_score: u64,
    }

    // ==================== Functions ====================

    /// Create a new leaderboard for a season
    public fun create_leaderboard(
        season_id: u64,
        ctx: &mut tx_context::TxContext
    ): Leaderboard {

        Leaderboard {
            id: object::new(ctx),
            season_id,
            player_stats: table::new(ctx),
            rankings: vector::empty(),
            total_players: 0,
            is_active: true,
        }
    }

    /// Initialize player stats if new
    fun ensure_player_stats(
        leaderboard: &mut Leaderboard,
        player: address,
    ) {
        if (!table::contains(&leaderboard.player_stats, player)) {
            let stats = PlayerStats {
                player,
                total_score: 0,
                wins: 0,
                losses: 0,
                current_streak: 0,
                best_streak: 0,
                total_rounds_played: 0,
                early_predictions: 0,
                last_round_id: 0,
            };
            table::add(&mut leaderboard.player_stats, player, stats);
            leaderboard.total_players = leaderboard.total_players + 1;
        };
    }

    /// Record a round result for a player
    public fun record_round_result(
        leaderboard: &mut Leaderboard,
        player: address,
        round_id: u64,
        is_win: bool,
        is_early: bool,
    ) {
        assert!(leaderboard.is_active, ERR_SEASON_NOT_ACTIVE);

        ensure_player_stats(leaderboard, player);

        let stats = table::borrow_mut(&mut leaderboard.player_stats, player);

        // Update round count
        stats.total_rounds_played = stats.total_rounds_played + 1;
        stats.last_round_id = round_id;

        let mut points_earned: u64 = 0;

        if (is_win) {
            // Base win points
            points_earned = points_earned + POINTS_WIN;
            stats.wins = stats.wins + 1;

            // Update streak
            stats.current_streak = stats.current_streak + 1;
            if (stats.current_streak > stats.best_streak) {
                stats.best_streak = stats.current_streak;
            };

            // Streak bonus (if streak >= 2)
            if (stats.current_streak >= 2) {
                points_earned = points_earned + POINTS_WIN_STREAK;
            };

            // Early prediction bonus
            if (is_early) {
                points_earned = points_earned + POINTS_EARLY_PREDICTION;
                stats.early_predictions = stats.early_predictions + 1;
            };

        } else {
            // Loss
            stats.losses = stats.losses + 1;

            // Break streak
            if (stats.current_streak > 0) {
                event::emit(StreakUpdated {
                    player,
                    new_streak: 0,
                    is_broken: true,
                });
            };
            stats.current_streak = 0;
        };

        // Update total score
        stats.total_score = stats.total_score + points_earned;

        event::emit(ScoreUpdated {
            season_id: leaderboard.season_id,
            player,
            points_earned,
            new_total_score: stats.total_score,
            current_streak: stats.current_streak,
        });

        // Update rankings for the player
        update_rankings(leaderboard, player, stats.total_score, stats.wins, stats.current_streak);
    }

    /// Update the rankings (sorted by score descending)
    fun update_rankings(
        leaderboard: &mut Leaderboard, 
        player: address, 
        score: u64, 
        wins: u64, 
        streak: u64
    ) {
        let entry = LeaderboardEntry {
            player,
            score,
            wins,
            streak,
        };

        // Find and remove existing entry for the player if any
        let mut i = 0;
        let len = vector::length(&leaderboard.rankings);
        while (i < len) {
            if (vector::borrow(&leaderboard.rankings, i).player == player) {
                vector::remove(&mut leaderboard.rankings, i);
                break
            };
            i = i + 1;
        };

        // Insert new entry in sorted position
        let mut insert_pos = 0;
        let new_len = vector::length(&leaderboard.rankings);
        while (insert_pos < new_len) {
            if (score > vector::borrow(&leaderboard.rankings, insert_pos).score) {
                break
            };
            insert_pos = insert_pos + 1;
        };
        vector::insert(&mut leaderboard.rankings, entry, insert_pos);

        // Keep only top 100 for performance (optional but good practice)
        if (vector::length(&leaderboard.rankings) > 100) {
            vector::pop_back(&mut leaderboard.rankings);
        };
    }

    /// Get top N players
    public fun get_top_players(
        leaderboard: &Leaderboard,
        count: u64
    ): vector<LeaderboardEntry> {
        let mut result = vector::empty<LeaderboardEntry>();
        let total = vector::length(&leaderboard.rankings);
        let limit = if (count < total) { count } else { total };

        let mut i = 0;
        while (i < limit) {
            let entry = *vector::borrow(&leaderboard.rankings, i);
            vector::push_back(&mut result, entry);
            i = i + 1;
        };

        result
    }

    /// Get player rank (1-based, 0 if not ranked)
    public fun get_player_rank(
        leaderboard: &Leaderboard,
        player: address
    ): u64 {
        let mut rank: u64 = 0;
        let total = vector::length(&leaderboard.rankings);

        let mut i = 0;
        while (i < total) {
            let entry = vector::borrow(&leaderboard.rankings, i);
            if (entry.player == player) {
                rank = i + 1; // 1-based ranking
                break
            };
            i = i + 1;
        };

        rank
    }

    /// End the season and determine winners
    public fun end_season(
        leaderboard: &mut Leaderboard,
    ) {
        assert!(leaderboard.is_active, ERR_SEASON_NOT_ACTIVE);

        leaderboard.is_active = false;

        // Get winner (rank 1)
        if (vector::length(&leaderboard.rankings) > 0) {
            let winner_entry = vector::borrow(&leaderboard.rankings, 0);

            event::emit(SeasonEnded {
                season_id: leaderboard.season_id,
                total_players: leaderboard.total_players,
                winner: winner_entry.player,
                winning_score: winner_entry.score,
            });
        };
    }

    // ==================== View Functions ====================

    /// Get player statistics
    public fun get_player_stats(
        leaderboard: &Leaderboard,
        player: address
    ): (u64, u64, u64, u64, u64, u64) {
        assert!(table::contains(&leaderboard.player_stats, player), ERR_PLAYER_NOT_FOUND);

        let stats = table::borrow(&leaderboard.player_stats, player);
        (
            stats.total_score,
            stats.wins,
            stats.losses,
            stats.current_streak,
            stats.best_streak,
            stats.total_rounds_played
        )
    }

    /// Get player's win rate (in basis points, e.g., 7500 = 75%)
    public fun get_win_rate(
        leaderboard: &Leaderboard,
        player: address
    ): u64 {
        assert!(table::contains(&leaderboard.player_stats, player), ERR_PLAYER_NOT_FOUND);

        let stats = table::borrow(&leaderboard.player_stats, player);

        if (stats.total_rounds_played == 0) {
            return 0
        };

        // Calculate win rate in basis points (10000 = 100%)
        (stats.wins * 10000) / stats.total_rounds_played
    }

    /// Check if player exists in leaderboard
    public fun has_player(
        leaderboard: &Leaderboard,
        player: address
    ): bool {
        table::contains(&leaderboard.player_stats, player)
    }

    /// Get total number of players
    public fun get_total_players(
        leaderboard: &Leaderboard
    ): u64 {
        leaderboard.total_players
    }

    /// Get season status
    public fun is_active(
        leaderboard: &Leaderboard
    ): bool {
        leaderboard.is_active
    }

    /// Share the leaderboard object (make it globally accessible)
    public fun share_leaderboard(leaderboard: Leaderboard) {
        transfer::share_object(leaderboard);
    }
}

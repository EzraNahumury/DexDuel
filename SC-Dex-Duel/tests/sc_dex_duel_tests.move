#[test_only]
module sc_dex_duel::sc_dex_duel_tests {
    use one::test_scenario::{Self as ts, Scenario};
    use one::coin::{Self, Coin};
    use sc_dex_duel::usdt::USDT;
    use one::clock::{Self, Clock};
    use sc_dex_duel::game_round::{Self, Round, Treasury};
    use sc_dex_duel::prediction::{Self, PredictionRegistry};
    use sc_dex_duel::leaderboard::{Self, Leaderboard};
    use sc_dex_duel::game_controller::{Self, GameSession};

    // ==================== Test Constants ====================

    const ADMIN: address = @0xAD;
    const PLAYER1: address = @0xA1;
    const PLAYER2: address = @0xA2;
    const PLAYER3: address = @0xA3;

    const ROUND_ID: u64 = 1;
    const SEASON_ID: u64 = 1;
    const ENTRY_FEE: u64 = 1_000_000_000; // 1 USDT
    const START_TIME: u64 = 1000000;
    const END_TIME: u64 = 1300000; // 5 minutes later
    const EARLY_WINDOW: u64 = 1; // 1 minute
    const MAX_WINDOW: u64 = 2; // 2 minutes (Lock period)
    const MIN_PARTICIPANTS: u64 = 1;
    const MIN_PARTICIPANTS_STRICT: u64 = 3;

    const DIRECTION_UP: u8 = 1;
    const DIRECTION_DOWN: u8 = 2;

    const PRICE_START: u64 = 67000_00000000; // $67,000
    const PRICE_END_UP: u64 = 67690_00000000; // $67,690 (UP wins)
    const PRICE_END_DOWN: u64 = 66500_00000000; // $66,500 (DOWN wins)

    // ==================== Helper Functions ====================

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);

        // Initialize modules
        {
            game_round::test_init(ts::ctx(&mut scenario));
            sc_dex_duel::usdt::init_for_testing(ts::ctx(&mut scenario));
        };

        scenario
    }

    fun create_clock(scenario: &mut Scenario, timestamp: u64): Clock {
        let mut clock = clock::create_for_testing(ts::ctx(scenario));
        clock::set_for_testing(&mut clock, timestamp);
        clock
    }

    fun mint_usdt(scenario: &mut Scenario, amount: u64): Coin<USDT> {
        coin::mint_for_testing<USDT>(amount, ts::ctx(scenario))
    }

    fun abort_object<T: key + store>(obj: T) {
        transfer::public_transfer(obj, @0x0);
    }

    // ==================== Game Round Tests ====================

    #[test]
    fun test_create_round() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {

            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );

        };

        // Verify round was created
        ts::next_tx(&mut scenario, ADMIN);
        {
            let round = ts::take_shared<Round>(&scenario);

            let (round_id, start_time, end_time, price_start, price_end, winner) =
                game_round::get_round_info(&round);

            assert!(round_id == ROUND_ID, 0);
            assert!(start_time == START_TIME, 1);
            assert!(end_time == END_TIME, 2);
            assert!(price_start == 0, 3); // Not set yet
            assert!(price_end == 0, 4);
            assert!(winner == 0, 5);

            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_start_round() {
        let mut scenario = setup_test();

        // Create round
        ts::next_tx(&mut scenario, ADMIN);
        {

            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );

        };

        // Start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            let (_, _, _, price_start, _, _) = game_round::get_round_info(&round);
            assert!(price_start == PRICE_START, 0);

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_make_prediction_up() {
        let mut scenario = setup_test();

        // Create and start round
        ts::next_tx(&mut scenario, ADMIN);
        {

            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );

        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player makes prediction
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_round::make_prediction(
                &mut round,
                DIRECTION_UP,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            let (up_count, down_count, total_participants, total_pool) =
                game_round::get_round_stats(&round);

            assert!(up_count == 1, 0);
            assert!(down_count == 0, 1);
            assert!(total_participants == 1, 2);
            assert!(total_pool == ENTRY_FEE, 3);

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_multiple_predictions() {
        let mut scenario = setup_test();

        // Setup round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 predicts UP
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 2 predicts DOWN
        ts::next_tx(&mut scenario, PLAYER2);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 20000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_round::make_prediction(&mut round, DIRECTION_DOWN, payment, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 3 predicts UP
        ts::next_tx(&mut scenario, PLAYER3);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 30000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));

            let (up_count, down_count, total_participants, total_pool) =
                game_round::get_round_stats(&round);

            assert!(up_count == 2, 0);
            assert!(down_count == 1, 1);
            assert!(total_participants == 3, 2);
            assert!(total_pool == ENTRY_FEE * 3, 3);

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_end_round_up_wins() {
        let mut scenario = setup_test();

        // Setup and start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Players make predictions
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // End round with price UP
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, END_TIME);

            game_round::end_round(&mut round, PRICE_END_UP, &clock, ts::ctx(&mut scenario));

            let winner = game_round::get_winner_direction(&round);
            assert!(winner == DIRECTION_UP, 0);

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_end_round_down_wins() {
        let mut scenario = setup_test();

        // Setup and start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 joins to meet min_participants
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 100);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // End round with price DOWN
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, END_TIME);

            game_round::end_round(&mut round, PRICE_END_DOWN, &clock, ts::ctx(&mut scenario));

            let winner = game_round::get_winner_direction(&round);
            assert!(winner == DIRECTION_DOWN, 0);

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_settle_round_with_yield() {
        let mut scenario = setup_test();

        // Setup, start, and end round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 joins to meet min_participants
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 100);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, END_TIME);
            game_round::end_round(&mut round, PRICE_END_UP, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Add yield
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let yield_coin = mint_usdt(&mut scenario, 5_000_000_000); // 5 USDT yield

            game_round::add_yield(&mut round, yield_coin, ts::ctx(&mut scenario));

            ts::return_shared(round);
        };

        // Lock winners (no top3 in this test — just lock to allow settle)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            game_round::lock_winners(&mut round, ts::ctx(&mut scenario));
            ts::return_shared(round);
        };

        // Settle round
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);

            game_round::settle_round(&mut round, &mut treasury, ts::ctx(&mut scenario));

            assert!(game_round::is_settled(&round), 0);

            ts::return_shared(round);
            ts::return_shared(treasury);
        };

        ts::end(scenario);
    }

    // ==================== Prediction Tests ====================

    #[test]
    fun test_prediction_registry() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = prediction::create_registry(ROUND_ID, ADMIN, ts::ctx(&mut scenario));

            let (up_count, down_count, up_stake, down_stake) =
                prediction::get_stats(&registry);

            assert!(up_count == 0, 0);
            assert!(down_count == 0, 1);
            assert!(up_stake == 0, 2);
            assert!(down_stake == 0, 3);

            abort_object(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_record_prediction() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = prediction::create_registry(ROUND_ID, ADMIN, ts::ctx(&mut scenario));
            let clock = create_clock(&mut scenario, START_TIME + 10000);

            prediction::record_prediction(
                &mut registry,
                PLAYER1,
                DIRECTION_UP,
                ENTRY_FEE,
                START_TIME,
                EARLY_WINDOW,
                &clock
            );

            assert!(prediction::has_predicted(&registry, PLAYER1), 0);

            let (direction, stake, _, is_early, is_correct, rank) =
                prediction::get_prediction(&registry, PLAYER1);

            assert!(direction == DIRECTION_UP, 1);
            assert!(stake == ENTRY_FEE, 2);
            assert!(is_early == true, 3); // Within 1 minute
            assert!(is_correct == false, 4); // Not set yet
            assert!(rank == 0, 5);

            clock::destroy_for_testing(clock);
            abort_object(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_set_prediction_results() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = prediction::create_registry(ROUND_ID, ADMIN, ts::ctx(&mut scenario));
            let clock = create_clock(&mut scenario, START_TIME + 10000);

            // Record predictions
            prediction::record_prediction(
                &mut registry,
                PLAYER1,
                DIRECTION_UP,
                ENTRY_FEE,
                START_TIME,
                EARLY_WINDOW,
                &clock
            );

            prediction::record_prediction(
                &mut registry,
                PLAYER2,
                DIRECTION_DOWN,
                ENTRY_FEE,
                START_TIME,
                EARLY_WINDOW,
                &clock
            );

            // Set results (UP wins)
            prediction::set_prediction_results(&mut registry, DIRECTION_UP);

            // Check player 1 (UP - should win)
            let (_, _, _, _, is_correct_p1, _) =
                prediction::get_prediction(&registry, PLAYER1);
            assert!(is_correct_p1 == true, 0);

            // Check player 2 (DOWN - should lose)
            let (_, _, _, _, is_correct_p2, _) =
                prediction::get_prediction(&registry, PLAYER2);
            assert!(is_correct_p2 == false, 1);

            clock::destroy_for_testing(clock);
            abort_object(registry);
        };

        ts::end(scenario);
    }

    // ==================== Leaderboard Tests ====================

    #[test]
    fun test_leaderboard_creation() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            assert!(leaderboard::is_active(&leaderboard), 0);
            assert!(leaderboard::get_total_players(&leaderboard) == 0, 1);

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_record_win() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            // Record a win
            leaderboard::record_round_result(
                &mut leaderboard,
                PLAYER1,
                ROUND_ID,
                true,  // is_win
                false  // is_early
            );

            // Check stats
            let (score, wins, losses, streak, best_streak, rounds) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);

            assert!(score == 10, 0); // Base win = 10 points
            assert!(wins == 1, 1);
            assert!(losses == 0, 2);
            assert!(streak == 1, 3);
            assert!(best_streak == 1, 4);
            assert!(rounds == 1, 5);

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_win_with_early_bonus() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            // Record a win with early prediction
            leaderboard::record_round_result(
                &mut leaderboard,
                PLAYER1,
                ROUND_ID,
                true,  // is_win
                true   // is_early
            );

            let (score, _, _, _, _, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);

            assert!(score == 13, 0); // Win (10) + Early (3) = 13

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_win_streak() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            // First win
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 1, true, false);

            let (score1, _, _, streak1, _, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);
            assert!(score1 == 10, 0); // 10 points (no streak bonus yet)
            assert!(streak1 == 1, 1);

            // Second win (streak bonus applies)
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 2, true, false);

            let (score2, _, _, streak2, best, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);
            assert!(score2 == 25, 2); // 10 + (10 + 5) = 25
            assert!(streak2 == 2, 3);
            assert!(best == 2, 4);

            // Third win
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 3, true, true);

            let (score3, _, _, streak3, _, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);
            assert!(score3 == 43, 5); // 25 + (10 + 5 + 3) = 43
            assert!(streak3 == 3, 6);

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_streak_break() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            // Win 1
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 1, true, false);
            // Win 2
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 2, true, false);

            let (score_before, _, _, streak_before, best_before, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);
            assert!(streak_before == 2, 0);
            assert!(best_before == 2, 1);

            // Loss (streak breaks)
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 3, false, false);

            let (score_after, wins, losses, streak_after, best_after, _) =
                leaderboard::get_player_stats(&leaderboard, PLAYER1);
            assert!(score_after == score_before, 2); // No points for loss
            assert!(wins == 2, 3);
            assert!(losses == 1, 4);
            assert!(streak_after == 0, 5); // Streak reset
            assert!(best_after == 2, 6); // Best streak preserved

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_win_rate() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut leaderboard = leaderboard::create_leaderboard(SEASON_ID, ts::ctx(&mut scenario));

            // 3 wins, 1 loss
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 1, true, false);
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 2, true, false);
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 3, false, false);
            leaderboard::record_round_result(&mut leaderboard, PLAYER1, 4, true, false);

            let win_rate = leaderboard::get_win_rate(&leaderboard, PLAYER1);

            // 3 wins / 4 rounds = 0.75 = 7500 in basis points
            assert!(win_rate == 7500, 0);

            abort_object(leaderboard);
        };

        ts::end(scenario);
    }

    // ==================== Integration Tests ====================

    #[test]
    fun test_full_game_flow() {
        let mut scenario = setup_test();

        // Admin creates game session
        ts::next_tx(&mut scenario, ADMIN);
        {

            game_controller::create_game_session(
                ROUND_ID,
                SEASON_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                EARLY_WINDOW,
                MAX_WINDOW,
                ts::ctx(&mut scenario
            )
            );
            
            // NEW: Initialize the tournament leaderboard once
            game_controller::initialize_tournament(SEASON_ID, ts::ctx(&mut scenario));

        };

        // Admin starts the game
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);

            game_controller::start_game(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Players join
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let session = ts::take_shared<GameSession>(&scenario);
            let mut round = ts::take_shared<Round>(&scenario);
            let mut registry = ts::take_shared<PredictionRegistry>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_controller::join_game(
                &session,
                &mut round,
                &mut registry,
                DIRECTION_UP,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(session);
            ts::return_shared(round);
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, PLAYER2);
        {
            let session = ts::take_shared<GameSession>(&scenario);
            let mut round = ts::take_shared<Round>(&scenario);
            let mut registry = ts::take_shared<PredictionRegistry>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 20000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_controller::join_game(
                &session,
                &mut round,
                &mut registry,
                DIRECTION_UP,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(session);
            ts::return_shared(round);
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, PLAYER3);
        {
            let session = ts::take_shared<GameSession>(&scenario);
            let mut round = ts::take_shared<Round>(&scenario);
            let mut registry = ts::take_shared<PredictionRegistry>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 90000); // Late prediction
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_controller::join_game(
                &session,
                &mut round,
                &mut registry,
                DIRECTION_DOWN,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(session);
            ts::return_shared(round);
            ts::return_shared(registry);
        };

        // Verify game stats
        ts::next_tx(&mut scenario, ADMIN);
        {
            let round = ts::take_shared<Round>(&scenario);
            let (up_count, down_count, total_participants, _) =
                game_round::get_round_stats(&round);

            assert!(up_count == 2, 0);
            assert!(down_count == 1, 1);
            assert!(total_participants == 3, 2);

            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_ALREADY_PREDICTED)]
    fun test_cannot_predict_twice() {
        let mut scenario = setup_test();

        // Setup round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // First prediction
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Second prediction (should fail)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 20000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_DOWN, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_INVALID_ENTRY_FEE)]
    fun test_invalid_entry_fee() {
        let mut scenario = setup_test();

        // Setup round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Predict with wrong entry fee
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE / 2); // Wrong amount
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    // ==================== Cancel Tournament Tests ====================

    /// Happy-path: admin creates a round, players register, admin cancels,
    /// then each player claims their full entry-fee refund.
    #[test]
    fun test_cancel_tournament_and_refund() {
        let mut scenario = setup_test();

        // Create round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        // Start round so players can join
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 joins (UP)
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 2 joins (DOWN)
        ts::next_tx(&mut scenario, PLAYER2);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 20000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_DOWN, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Verify 2 USDT are locked in the pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let round = ts::take_shared<Round>(&scenario);
            let (_, _, total_participants, pool_value) = game_round::get_round_stats(&round);
            assert!(total_participants == 2, 0);
            assert!(pool_value == ENTRY_FEE * 2, 1);
            ts::return_shared(round);
        };

        // Admin cancels the tournament
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME - 100);
            game_round::cancel_round(&mut round, &clock, ts::ctx(&mut scenario));
            assert!(game_round::is_cancelled(&round), 2);
            clock::destroy_for_testing(clock);
            assert!(!game_round::has_claimed_refund(&round, PLAYER1), 3);
            assert!(!game_round::has_claimed_refund(&round, PLAYER2), 4);
            ts::return_shared(round);
        };

        // Player 1 claims refund
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let refund = game_round::claim_refund(&mut round, ts::ctx(&mut scenario));
            assert!(coin::value(&refund) == ENTRY_FEE, 5);
            assert!(game_round::has_claimed_refund(&round, PLAYER1), 6);
            transfer::public_transfer(refund, PLAYER1);
            ts::return_shared(round);
        };

        // Player 2 claims refund
        ts::next_tx(&mut scenario, PLAYER2);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let refund = game_round::claim_refund(&mut round, ts::ctx(&mut scenario));
            assert!(coin::value(&refund) == ENTRY_FEE, 7);
            assert!(game_round::has_claimed_refund(&round, PLAYER2), 8);
            transfer::public_transfer(refund, PLAYER2);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    /// Admin cannot cancel an already-cancelled round.
    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_ROUND_CANCELLED)]
    fun test_cannot_cancel_twice() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME - 100);
            game_round::cancel_round(&mut round, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Second cancel must abort with ERR_ROUND_CANCELLED
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME - 100);
            game_round::cancel_round(&mut round, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    /// A player cannot claim a refund on a round that was never cancelled.
    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_ROUND_NOT_CANCELLED)]
    fun test_cannot_refund_non_cancelled_round() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Attempt refund without cancellation — must abort with ERR_ROUND_NOT_CANCELLED
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let refund = game_round::claim_refund(&mut round, ts::ctx(&mut scenario));
            transfer::public_transfer(refund, PLAYER1);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    /// Player cannot claim refund twice on the same cancelled round.
    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_REFUND_ALREADY_CLAIMED)]
    fun test_cannot_double_claim_refund() {
        let mut scenario = setup_test();

        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 10000);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME - 100);
            game_round::cancel_round(&mut round, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // First refund — succeeds
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let refund = game_round::claim_refund(&mut round, ts::ctx(&mut scenario));
            transfer::public_transfer(refund, PLAYER1);
            ts::return_shared(round);
        };

        // Second refund — must abort with ERR_REFUND_ALREADY_CLAIMED
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let refund = game_round::claim_refund(&mut round, ts::ctx(&mut scenario));
            transfer::public_transfer(refund, PLAYER1);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_INSUFFICIENT_PARTICIPANTS)]
    fun test_min_participants_check() {
        let mut scenario = setup_test();

        // Setup round with min_participants = 3
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS_STRICT,
                ts::ctx(&mut scenario
            )
            );
        };

        // Start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 joins
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 100);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Try to end with only 1 player (should fail)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, END_TIME);
            game_round::end_round(&mut round, PRICE_END_UP, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = sc_dex_duel::game_round::ERR_ROUND_ALREADY_ACTIVE)]
    fun test_cannot_cancel_live_round() {
        let mut scenario = setup_test();

        // Setup and start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_round::create_round(
                ROUND_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                START_TIME + 120000,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                ts::ctx(&mut scenario
            )
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME);
            game_round::start_round(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Player 1 joins to EXCEED low participation threshold
        ts::next_tx(&mut scenario, PLAYER1);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 100);
            let payment = mint_usdt(&mut scenario, ENTRY_FEE);
            game_round::make_prediction(&mut round, DIRECTION_UP, payment, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // Try to cancel now that it is active (should fail)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let clock = create_clock(&mut scenario, START_TIME + 100);
            game_round::cancel_round(&mut round, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_score_accumulation_across_rounds() {
        let mut scenario = setup_test();

        // 1. Initialize Tournament
        ts::next_tx(&mut scenario, ADMIN);
        game_controller::initialize_tournament(SEASON_ID, ts::ctx(&mut scenario));

        // 2. Round 1: Player wins
        ts::next_tx(&mut scenario, ADMIN);
        game_controller::create_game_session(
                1,
                SEASON_ID,
                b"BTC",
                100,
                200,
                ENTRY_FEE,
                1,
                1,
                MAX_WINDOW,
                ts::ctx(&mut scenario
            )
        );

        // Player wins Round 1
        ts::next_tx(&mut scenario, PLAYER1);
        let mut leaderboard = ts::take_shared<Leaderboard>(&scenario);
        leaderboard::record_round_result(&mut leaderboard, PLAYER1, 1, true, false);
        
        let (score1, _, _, _, _, _) = leaderboard::get_player_stats(&leaderboard, PLAYER1);
        assert!(score1 == 10, 0);
        ts::return_shared(leaderboard);

        // 3. Round 2: Same player wins again (should accumulate)
        ts::next_tx(&mut scenario, ADMIN);
        game_controller::create_game_session(
                2,
                SEASON_ID,
                b"BTC",
                300,
                400,
                ENTRY_FEE,
                1,
                1,
                MAX_WINDOW,
                ts::ctx(&mut scenario
            )
        );

        ts::next_tx(&mut scenario, PLAYER1);
        let mut leaderboard = ts::take_shared<Leaderboard>(&scenario);
        leaderboard::record_round_result(&mut leaderboard, PLAYER1, 2, true, false);
        
        // Score should now be 10 (Round 1) + 10 (Round 2) + 5 (Streak Bonus) = 25
        let (score2, _, _, _, _, _) = leaderboard::get_player_stats(&leaderboard, PLAYER1);
        assert!(score2 == 25, 1);
        
        ts::return_shared(leaderboard);
        ts::end(scenario);
    }
}

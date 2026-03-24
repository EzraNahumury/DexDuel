#[test_only]
module sc_dex_duel::usdt_faucet_tests {
    use one::test_scenario::{Self as ts};
    use one::coin;
    use sc_dex_duel::usdt::{Self, USDT, Faucet};

    const USER1: address = @0xA1;
    const USER2: address = @0xA2;

    /// Test: User berhasil klaim 100 USDT
    #[test]
    fun test_claim_faucet_success() {
        let mut scenario = ts::begin(USER1);
        { usdt::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut faucet = ts::take_shared<Faucet>(&scenario);
            let usdt_coin = usdt::claim_faucet(&mut faucet, ts::ctx(&mut scenario));

            // 100 USDT = 100_000_000 (6 desimal)
            assert!(coin::value(&usdt_coin) == 100_000_000, 0);

            transfer::public_transfer(usdt_coin, USER1);
            ts::return_shared(faucet);
        };

        scenario.end();
    }

    /// Test: User bisa klaim BERKALI-KALI
    #[test]
    fun test_claim_faucet_multiple_times() {
        let mut scenario = ts::begin(USER1);
        { usdt::init_for_testing(ts::ctx(&mut scenario)); };

        // Klaim pertama
        ts::next_tx(&mut scenario, USER1);
        {
            let mut faucet = ts::take_shared<Faucet>(&scenario);
            let coin1 = usdt::claim_faucet(&mut faucet, ts::ctx(&mut scenario));
            assert!(coin::value(&coin1) == 100_000_000, 0);
            transfer::public_transfer(coin1, USER1);
            ts::return_shared(faucet);
        };

        // Klaim kedua — tetap berhasil!
        ts::next_tx(&mut scenario, USER1);
        {
            let mut faucet = ts::take_shared<Faucet>(&scenario);
            let coin2 = usdt::claim_faucet(&mut faucet, ts::ctx(&mut scenario));
            assert!(coin::value(&coin2) == 100_000_000, 1);
            transfer::public_transfer(coin2, USER1);
            ts::return_shared(faucet);
        };

        scenario.end();
    }

    /// Test: Dua user berbeda bisa klaim secara independen
    #[test]
    fun test_two_users_claim_independently() {
        let mut scenario = ts::begin(USER1);
        { usdt::init_for_testing(ts::ctx(&mut scenario)); };

        ts::next_tx(&mut scenario, USER1);
        {
            let mut faucet = ts::take_shared<Faucet>(&scenario);
            let coin1 = usdt::claim_faucet(&mut faucet, ts::ctx(&mut scenario));
            assert!(coin::value(&coin1) == 100_000_000, 0);
            transfer::public_transfer(coin1, USER1);
            ts::return_shared(faucet);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let mut faucet = ts::take_shared<Faucet>(&scenario);
            let coin2 = usdt::claim_faucet(&mut faucet, ts::ctx(&mut scenario));
            assert!(coin::value(&coin2) == 100_000_000, 1);
            transfer::public_transfer(coin2, USER2);
            ts::return_shared(faucet);
        };

        scenario.end();
    }

    /// Test: verifikasi konstanta faucet_amount = 100 USDT
    #[test]
    fun test_faucet_amount_constant() {
        assert!(usdt::faucet_amount() == 100_000_000, 0);
    }
}

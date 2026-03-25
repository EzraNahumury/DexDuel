"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/* ─── Supported locales ───────────────────────────────────────── */
export type Locale = "en" | "id" | "zh";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

/* ─── Translation dictionary ──────────────────────────────────── */
const translations = {
  // ── Navbar ──
  "nav.tournaments": { en: "Tournaments", id: "Turnamen", zh: "锦标赛" },
  "nav.create": { en: "Create", id: "Buat", zh: "创建" },
  "nav.leaderboard": { en: "Leaderboard", id: "Peringkat", zh: "排行榜" },
  "nav.myArena": { en: "My Arena", id: "Arena Saya", zh: "我的竞技场" },
  "nav.connect": { en: "Connect", id: "Hubungkan", zh: "连接" },

  // ── Common ──
  "common.refresh": { en: "Refresh", id: "Muat Ulang", zh: "刷新" },
  "common.usdt": { en: "USDT", id: "USDT", zh: "USDT" },
  "common.loading": { en: "Loading...", id: "Memuat...", zh: "加载中..." },
  "common.search": { en: "Search", id: "Cari", zh: "搜索" },
  "common.all": { en: "All", id: "Semua", zh: "全部" },
  "common.live": { en: "Live", id: "Langsung", zh: "进行中" },
  "common.upcoming": { en: "Upcoming", id: "Segera", zh: "即将开始" },
  "common.completed": { en: "Completed", id: "Selesai", zh: "已完成" },
  "common.status": { en: "Status", id: "Status", zh: "状态" },
  "common.you": { en: "You", id: "Anda", zh: "你" },
  "common.wins": { en: "Wins", id: "Menang", zh: "胜利" },
  "common.streak": { en: "Streak", id: "Beruntun", zh: "连胜" },
  "common.score": { en: "Score", id: "Skor", zh: "积分" },
  "common.rank": { en: "Rank", id: "Peringkat", zh: "排名" },
  "common.points": { en: "points", id: "poin", zh: "积分" },
  "common.reward": { en: "Reward", id: "Hadiah", zh: "奖励" },
  "common.claim": { en: "Claim", id: "Klaim", zh: "领取" },
  "common.claiming": { en: "Claiming...", id: "Mengklaim...", zh: "领取中..." },
  "common.claimed": { en: "Claimed", id: "Diklaim", zh: "已领取" },
  "common.rounds": { en: "rounds", id: "ronde", zh: "轮次" },
  "common.season": { en: "Season", id: "Musim", zh: "赛季" },
  "common.player": { en: "Player", id: "Pemain", zh: "玩家" },
  "common.updated": { en: "Updated", id: "Diperbarui", zh: "更新时间" },
  "common.updates": { en: "Updates", id: "Pembaruan", zh: "更新" },
  "common.prev": { en: "Prev", id: "Sebelumnya", zh: "上一页" },
  "common.next": { en: "Next", id: "Selanjutnya", zh: "下一页" },

  // ── Tournaments Page ──
  "tournaments.title": { en: "Tournament Dashboard", id: "Dasbor Turnamen", zh: "锦标赛仪表盘" },
  "tournaments.subtitle": {
    en: "Track multi-round prediction seasons, monitor live sessions, and review results with a cleaner and faster browsing flow.",
    id: "Lacak musim prediksi multi-ronde, pantau sesi langsung, dan tinjau hasil dengan alur jelajah yang lebih bersih dan cepat.",
    zh: "跟踪多轮预测赛季，监控实时会话，以更简洁快速的方式浏览结果。",
  },
  "tournaments.onChain": { en: "On-Chain Tournaments", id: "Turnamen On-Chain", zh: "链上锦标赛" },
  "tournaments.totalRounds": { en: "Total Rounds", id: "Total Ronde", zh: "总轮次" },
  "tournaments.entryFee": { en: "Entry Fee", id: "Biaya Masuk", zh: "参赛费" },
  "tournaments.prizePool": { en: "Prize Pool", id: "Hadiah Total", zh: "奖池" },
  "tournaments.progress": { en: "Progress", id: "Progres", zh: "进度" },
  "tournaments.endsIn": { en: "Ends In", id: "Berakhir Dalam", zh: "结束倒计时" },
  "tournaments.startsIn": { en: "Starts In", id: "Mulai Dalam", zh: "开始倒计时" },
  "tournaments.roundProgress": { en: "Round Progress", id: "Progres Ronde", zh: "轮次进度" },
  "tournaments.predictNow": { en: "Predict Now", id: "Prediksi Sekarang", zh: "立即预测" },
  "tournaments.viewDetails": { en: "View Details", id: "Lihat Detail", zh: "查看详情" },
  "tournaments.viewResults": { en: "View Results", id: "Lihat Hasil", zh: "查看结果" },
  "tournaments.searchPlaceholder": { en: "Search coin or season...", id: "Cari koin atau musim...", zh: "搜索币种或赛季..." },
  "tournaments.showing": { en: "Showing", id: "Menampilkan", zh: "显示" },
  "tournaments.of": { en: "of", id: "dari", zh: "共" },
  "tournaments.tournamentWord": { en: "tournaments", id: "turnamen", zh: "锦标赛" },
  "tournaments.itemsPerPage": { en: "6 items per page", id: "6 item per halaman", zh: "每页6项" },
  "tournaments.noTournaments": { en: "No tournaments found", id: "Tidak ada turnamen", zh: "未找到锦标赛" },
  "tournaments.noTournamentsDesc": {
    en: "Try adjusting your search keyword or filters.",
    id: "Coba ubah kata kunci pencarian atau filter.",
    zh: "尝试调整搜索关键词或过滤条件。",
  },
  "tournaments.noTournamentsEmpty": {
    en: "No multi-round tournaments have been created yet.",
    id: "Belum ada turnamen multi-ronde yang dibuat.",
    zh: "尚未创建多轮锦标赛。",
  },
  "tournaments.createTournament": { en: "Create Tournament", id: "Buat Turnamen", zh: "创建锦标赛" },
  "tournaments.roundLive": { en: "is currently live", id: "sedang berlangsung", zh: "正在进行中" },
  "tournaments.roundStartsIn": { en: "starts in", id: "dimulai dalam", zh: "开始倒计时" },
  "tournaments.failed": { en: "Failed to load tournaments:", id: "Gagal memuat turnamen:", zh: "加载锦标赛失败：" },

  // ── Leaderboard Page ──
  "leaderboard.title": { en: "On-Chain Leaderboard", id: "Peringkat On-Chain", zh: "链上排行榜" },
  "leaderboard.subtitle": {
    en: "Aggregated from on-chain ScoreUpdated events.",
    id: "Dikumpulkan dari event ScoreUpdated on-chain.",
    zh: "基于链上 ScoreUpdated 事件汇总。",
  },
  "leaderboard.liveRankings": { en: "Live Rankings", id: "Peringkat Langsung", zh: "实时排名" },
  "leaderboard.lastEvent": { en: "Last event:", id: "Event terakhir:", zh: "最后事件：" },
  "leaderboard.totalPlayers": { en: "Total Players", id: "Total Pemain", zh: "总玩家数" },
  "leaderboard.totalScore": { en: "Total Score", id: "Total Skor", zh: "总积分" },
  "leaderboard.topScore": { en: "Top Score", id: "Skor Tertinggi", zh: "最高分" },
  "leaderboard.hallOfFame": { en: "Hall Of Fame", id: "Hall of Fame", zh: "名人堂" },
  "leaderboard.allPlayers": { en: "All Players", id: "Semua Pemain", zh: "所有玩家" },
  "leaderboard.searchPlaceholder": { en: "Search wallet address...", id: "Cari alamat wallet...", zh: "搜索钱包地址..." },
  "leaderboard.noData": { en: "No leaderboard data found.", id: "Data peringkat tidak ditemukan.", zh: "未找到排行榜数据。" },
  "leaderboard.failed": { en: "Failed to load leaderboard:", id: "Gagal memuat peringkat:", zh: "加载排行榜失败：" },

  // ── Profile Page ──
  "profile.title": { en: "My Profile", id: "Profil Saya", zh: "我的资料" },
  "profile.connectDesc": {
    en: "Connect your wallet to view stats, tournament history, and claimable rewards.",
    id: "Hubungkan wallet untuk melihat statistik, riwayat turnamen, dan hadiah yang bisa diklaim.",
    zh: "连接钱包查看统计数据、锦标赛历史和可领取的奖励。",
  },
  "profile.usdtBalance": { en: "USDT Balance", id: "Saldo USDT", zh: "USDT 余额" },
  "profile.tournaments": { en: "Tournaments", id: "Turnamen", zh: "锦标赛" },
  "profile.winRate": { en: "Win Rate", id: "Tingkat Menang", zh: "胜率" },
  "profile.globalRank": { en: "Global Rank", id: "Peringkat Global", zh: "全球排名" },
  "profile.predictionSplit": { en: "Prediction Split", id: "Pembagian Prediksi", zh: "预测分布" },
  "profile.up": { en: "UP", id: "NAIK", zh: "涨" },
  "profile.down": { en: "DOWN", id: "TURUN", zh: "跌" },
  "profile.finishedRounds": { en: "finished rounds", id: "ronde selesai", zh: "已完成轮次" },
  "profile.payoutsReady": { en: "ready to claim", id: "siap diklaim", zh: "可领取" },
  "profile.payout": { en: "payout", id: "pembayaran", zh: "支付" },
  "profile.payouts": { en: "payouts", id: "pembayaran", zh: "支付" },
  "profile.prizePool": { en: "Prize pool:", id: "Hadiah total:", zh: "奖池：" },
  "profile.tournamentHistory": { en: "Tournament History", id: "Riwayat Turnamen", zh: "锦标赛历史" },
  "profile.joinNew": { en: "Join New", id: "Ikut Baru", zh: "参加新赛" },
  "profile.prizeSplit": {
    en: "Prize: 1st = 50% · 2nd = 30% · 3rd = 20%",
    id: "Hadiah: Juara 1 = 50% · Juara 2 = 30% · Juara 3 = 20%",
    zh: "奖金：第1名 = 50% · 第2名 = 30% · 第3名 = 20%",
  },
  "profile.noTournaments": { en: "No tournaments yet", id: "Belum ada turnamen", zh: "暂无锦标赛" },
  "profile.noTournamentsDesc": {
    en: "Join a tournament to start earning rewards.",
    id: "Ikuti turnamen untuk mulai mendapatkan hadiah.",
    zh: "参加锦标赛开始赚取奖励。",
  },
  "profile.browseTournaments": { en: "Browse Tournaments", id: "Jelajahi Turnamen", zh: "浏览锦标赛" },
  "profile.globalLeaderboard": { en: "Global Leaderboard", id: "Peringkat Global", zh: "全球排行榜" },
  "profile.globalLeaderboardDesc": { en: "See how you rank globally", id: "Lihat peringkat global Anda", zh: "查看你的全球排名" },
  "profile.browseTournamentsDesc": { en: "Join live rounds and earn USDT prizes", id: "Ikuti ronde langsung dan dapatkan hadiah USDT", zh: "参加实时轮次，赢取 USDT 奖励" },

  // ── Footer ──
  "footer.description": {
    en: "Lossless GameFi prediction arena on OneChain. Compete, predict, and earn yield — your principal stays safe.",
    id: "Arena prediksi GameFi tanpa rugi di OneChain. Berkompetisi, prediksi, dan dapatkan yield — modal Anda tetap aman.",
    zh: "OneChain 上的无损 GameFi 预测竞技场。竞争、预测、赚取收益——您的本金始终安全。",
  },
  "footer.navigate": { en: "Navigate", id: "Navigasi", zh: "导航" },
  "footer.resources": { en: "Resources", id: "Sumber Daya", zh: "资源" },
  "footer.howItWorks": { en: "How It Works", id: "Cara Kerja", zh: "使用方法" },
  "footer.step1": { en: "Join a tournament with USDT", id: "Ikuti turnamen dengan USDT", zh: "使用 USDT 加入锦标赛" },
  "footer.step2": { en: "Predict crypto price direction", id: "Prediksi arah harga kripto", zh: "预测加密货币价格走向" },
  "footer.step3": { en: "Win rounds and climb the leaderboard", id: "Menangkan ronde dan naiki peringkat", zh: "赢得轮次并攀升排行榜" },
  "footer.step4": { en: "Claim prize pool rewards", id: "Klaim hadiah dari prize pool", zh: "领取奖池奖励" },
  "footer.copyright": { en: "DexDuel. Built for OneChain Hackathon.", id: "DexDuel. Dibuat untuk Hackathon OneChain.", zh: "DexDuel. 为 OneChain 黑客松打造。" },

  // ── Arena Page ──
  "arena.title": { en: "Tournament Arena", id: "Arena Turnamen", zh: "锦标赛竞技场" },
  "arena.createNew": { en: "Create New Tournament", id: "Buat Turnamen Baru", zh: "创建新锦标赛" },

  // ── Homepage ──
  "home.badge": { en: "World's First Lossless Arena", id: "Arena Tanpa Rugi Pertama di Dunia", zh: "全球首个无损竞技场" },
  "home.heroLine1": { en: "Unleashing", id: "Melepaskan", zh: "释放" },
  "home.heroLine2": { en: "the Power", id: "Kekuatan", zh: "强大力量" },
  "home.heroLine3": { en: "of", id: "dari", zh: "" },
  "home.heroDesc": {
    en: "Transforming trading with secure, lossless, and transparent prediction markets. Stake, predict, and win the yield — powered by OneChain.",
    id: "Mentransformasi perdagangan dengan pasar prediksi yang aman, tanpa rugi, dan transparan. Stake, prediksi, dan menangkan yield — didukung OneChain.",
    zh: "通过安全、无损、透明的预测市场变革交易。质押、预测、赢取收益——由 OneChain 驱动。",
  },
  "home.enterArena": { en: "Enter Arena", id: "Masuk Arena", zh: "进入竞技场" },
  "home.discoverHow": { en: "Discover How It Works", id: "Pelajari Cara Kerjanya", zh: "了解运作方式" },
  "home.whyTitle": { en: "DexDuel?", id: "DexDuel?", zh: "DexDuel?" },
  "home.whySubtitle": {
    en: "DexDuel is redefining yield in the digital world. Here's why it matters.",
    id: "DexDuel mendefinisikan ulang yield di dunia digital. Inilah mengapa itu penting.",
    zh: "DexDuel 正在重新定义数字世界的收益。这就是它重要的原因。",
  },
  "home.zeroRisk": { en: "Zero Risk", id: "Tanpa Risiko", zh: "零风险" },
  "home.zeroRiskDesc": {
    en: "Your principal is always protected. Losers get 100% of their stake back instantly.",
    id: "Modal Anda selalu terlindungi. Yang kalah mendapat 100% stake mereka kembali secara instan.",
    zh: "您的本金始终受到保护。输家可以立即获得100%的质押返还。",
  },
  "home.instantPayouts": { en: "Instant Payouts", id: "Pembayaran Instan", zh: "即时支付" },
  "home.instantPayoutsDesc": {
    en: "Yield distributed the moment each round closes. No waiting, no delays.",
    id: "Yield didistribusikan saat setiap ronde berakhir. Tanpa menunggu, tanpa penundaan.",
    zh: "每轮结束时立即分配收益。无需等待，没有延迟。",
  },
  "home.transparency": { en: "Transparency", id: "Transparansi", zh: "透明度" },
  "home.transparencyDesc": {
    en: "Every round, stake, and outcome is fully verifiable on-chain. No black boxes.",
    id: "Setiap ronde, stake, dan hasil sepenuhnya dapat diverifikasi on-chain. Tidak ada kotak hitam.",
    zh: "每一轮、每笔质押和结果都可以在链上完全验证。没有黑箱。",
  },
  "home.efficiency": { en: "Efficiency", id: "Efisiensi", zh: "高效" },
  "home.efficiencyDesc": {
    en: "5-minute rounds on OneChain. The fastest prediction market alive.",
    id: "Ronde 5 menit di OneChain. Pasar prediksi tercepat yang ada.",
    zh: "OneChain 上5分钟一轮。最快的预测市场。",
  },
  "home.whyMattersTitle": { en: "Matters", id: "Penting", zh: "的重要性" },
  "home.whyMattersDesc": {
    en: "DexDuel is revolutionizing how we handle trading and yield. By eliminating principal loss and creating secure, transparent systems, we're laying the foundation for a fairer financial future.",
    id: "DexDuel merevolusi cara kita menangani perdagangan dan yield. Dengan menghilangkan kerugian modal dan menciptakan sistem yang aman dan transparan, kami meletakkan fondasi untuk masa depan keuangan yang lebih adil.",
    zh: "DexDuel 正在革新我们处理交易和收益的方式。通过消除本金损失并创建安全透明的系统，我们正在为更公平的金融未来奠定基础。",
  },
  "home.liveBattles": { en: "Battles", id: "Pertarungan", zh: "对战" },
  "home.liveBattlesDesc": { en: "Predict the next 5-minute price movement", id: "Prediksi pergerakan harga 5 menit ke depan", zh: "预测未来5分钟的价格走势" },
  "home.allMarkets": { en: "All Markets", id: "Semua Pasar", zh: "所有市场" },
  "home.predictUp": { en: "Predict UP", id: "Prediksi NAIK", zh: "预测涨" },
  "home.predictDown": { en: "Predict DOWN", id: "Prediksi TURUN", zh: "预测跌" },
  "home.prizePoolYield": { en: "Prize Pool Yield", id: "Yield Hadiah", zh: "奖池收益" },
  "home.endsIn": { en: "Ends In", id: "Berakhir Dalam", zh: "结束倒计时" },
  "home.lockedPrice": { en: "Locked Price", id: "Harga Terkunci", zh: "锁定价格" },
  "home.arenaLegends": { en: "Arena Legends", id: "Legenda Arena", zh: "竞技场传奇" },
  "home.viewFullLeaderboard": { en: "View Full Leaderboard", id: "Lihat Peringkat Lengkap", zh: "查看完整排行榜" },
  "home.joinCollective": { en: "Join the Collective", id: "Bergabung dengan Komunitas", zh: "加入社区" },
  "home.joinCollectiveDesc": {
    en: "Join 50,000+ players in the Arena Discord. Get real-time alerts, market insights, and participate in governance voting for the next OneChain features.",
    id: "Bergabunglah dengan 50.000+ pemain di Discord Arena. Dapatkan notifikasi real-time, wawasan pasar, dan ikut serta dalam voting governance untuk fitur OneChain berikutnya.",
    zh: "加入 Arena Discord 的 50,000+ 名玩家。获取实时提醒、市场洞察，并参与 OneChain 下一个功能的治理投票。",
  },
  "home.recentActivity": { en: "Recent Activity", id: "Aktivitas Terbaru", zh: "最近活动" },
  "home.joinDiscord": { en: "Join Discord", id: "Gabung Discord", zh: "加入 Discord" },
  "home.followUs": { en: "Follow @DexDuel", id: "Ikuti @DexDuel", zh: "关注 @DexDuel" },
  "home.players": { en: "Players", id: "Pemain", zh: "玩家" },
  "home.uptime": { en: "Uptime", id: "Uptime", zh: "在线率" },
  "home.alerts": { en: "Alerts", id: "Notifikasi", zh: "提醒" },
  "home.winRate": { en: "Win Rate", id: "Tingkat Menang", zh: "胜率" },
  "home.trader": { en: "Trader", id: "Trader", zh: "交易员" },
  "home.yieldWon": { en: "Yield Won", id: "Yield Dimenangkan", zh: "赢得收益" },
} as const;

export type TranslationKey = keyof typeof translations;

/* ─── Context ─────────────────────────────────────────────────── */
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

/* ─── Provider ────────────────────────────────────────────────── */
const STORAGE_KEY = "dexduel-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "id" || stored === "zh")) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[locale] ?? entry.en;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────── */
export function useTranslation() {
  return useContext(I18nContext);
}

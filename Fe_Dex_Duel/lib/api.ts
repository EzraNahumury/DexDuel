export type TournamentItem = {
  id: string;
  roundNo: number | null;
  chainRoundId: string;
  roundId: string;
  seasonId: number | null;
  coinSymbol: string;
  pairSymbol: string;
  startTime: string;
  endTime: string;
  entryFee: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorBody = {
  error?: string;
  ok?: boolean;
};

type NonceResponse = {
  ok?: boolean;
  nonce: string;
};

type VerifyResponse = {
  ok: boolean;
  address?: string;
  error?: string;
};

type TournamentsResponse = {
  ok: boolean;
  data: TournamentItem[];
  error?: string;
};

type CreateTournamentBody = {
  pairSymbol: string;
  startTimeMs: number;
  endTimeMs: number;
  seasonNo?: number;
};

export type AdminCreateTournamentResponse = {
  tx?: {
    target?: string;
    function?: string;
    args?: unknown[];
    arguments?: unknown[];
    typeArguments?: string[];
  };
  error?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  return (await res.json()) as T;
}

export function getTournaments() {
  return apiJson<TournamentsResponse>("/api/tournaments");
}

export function getAuthNonce() {
  return apiJson<NonceResponse>("/api/auth/nonce");
}

export function verifyAdmin(address: string, signature: string, nonce: string) {
  return apiJson<VerifyResponse>("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, nonce }),
  });
}

export function createTournamentTx(payload: CreateTournamentBody) {
  return apiJson<AdminCreateTournamentResponse>("/api/admin/tournaments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

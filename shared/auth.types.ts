export interface AuthTokenPayload {
  sub: "gustavo";
  iat: number;
  exp: number;
}

export interface LoginRequest {
  token: string;
}

export interface LoginResponse {
  ok: true;
}

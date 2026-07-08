import { Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

interface CookieEnv {
  NODE_ENV?: string;
  COOKIE_DOMAIN?: string;
  JWT_ACCESS_EXPIRES?: string;
  JWT_REFRESH_EXPIRES?: string;
}

const readEnv = (env: CookieEnv | NodeJS.ProcessEnv): CookieEnv =>
  env as CookieEnv;

const parseDurationMs = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return fallback;
  const n = Number(match[1]);
  const unit = match[2];
  const map: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (map[unit] ?? 1000);
};

const baseCookieOptions = (env: CookieEnv) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  signed: true,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  envInput: CookieEnv | NodeJS.ProcessEnv = process.env,
) => {
  const env = readEnv(envInput);
  const accessMs = parseDurationMs(env.JWT_ACCESS_EXPIRES, 15 * 60 * 1000);
  const refreshMs = parseDurationMs(
    env.JWT_REFRESH_EXPIRES,
    7 * 24 * 60 * 60 * 1000,
  );
  const opts = baseCookieOptions(env);
  res.cookie(ACCESS_COOKIE, accessToken, { ...opts, maxAge: accessMs });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...opts, maxAge: refreshMs });
};

export const clearAuthCookies = (
  res: Response,
  envInput: CookieEnv | NodeJS.ProcessEnv = process.env,
) => {
  const env = readEnv(envInput);
  const opts = baseCookieOptions(env);
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
};

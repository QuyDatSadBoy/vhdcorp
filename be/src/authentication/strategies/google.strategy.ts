import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>("GOOGLE_CLIENT_ID") || "missing-client-id",
      clientSecret: config.get<string>("GOOGLE_CLIENT_SECRET") || "missing-client-secret",
      callbackURL:
        config.get<string>("GOOGLE_CALLBACK_URL") ||
        "http://localhost:8080/api/auth/google/callback",
      scope: ["email", "profile"],
      passReqToCallback: false,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName?: string;
      photos?: { value: string }[];
    },
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error("Không lấy được email từ Google profile"), undefined);
      return;
    }
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName ?? "",
      picture: profile.photos?.[0]?.value ?? null,
    };
    done(null, googleProfile);
  }
}

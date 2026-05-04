import { Injectable } from "@nestjs/common";
import * as CSRF from "csrf";

@Injectable()
export class CsrfService {
  private tokens: CSRF;

  constructor() {
    this.tokens = new CSRF();
  }

  // Generate a CSRF secret (stored per session/user)
  generateSecret(): string {
    return this.tokens.secretSync(); // Synchronous version for simplicity
  }

  // Generate a CSRF token based on a secret
  generateToken(secret: string): string {
    return this.tokens.create(secret);
  }

  // Validate a CSRF token against a secret
  validateToken(secret: string, token: string): boolean {
    return this.tokens.verify(secret, token);
  }
}
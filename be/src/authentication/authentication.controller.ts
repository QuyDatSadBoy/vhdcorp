import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { AuthenticationService } from "./authentication.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { JwtAuthGuard } from "@guard/jwt-auth.guard";
import { CsrfService } from "@service/csrf/csrf.service";
import { CsrfGuard } from "@guard/csrf.guard";
@Controller("auth")
@ApiTags("Authentication")
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService, private readonly csrfService: CsrfService) {
  }

  @Post("login")
  async login(@Body() { credential }: { credential: string }, @Res() res: Response) {
    const result = await this.authenticationService.login(credential);
    if (result instanceof HttpException) {
      throw result;
    }
    res.cookie("auth_token", result.token, {
      httpOnly: true,
      maxAge: 3600000 * 24 * 7, // 7 days
      sameSite: "strict",  // Protects against CSRF
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      signed: true
    });
    return res.json({ message: "Logged in successfully" });
  }

  @Post("logout")
  @UseGuards(CsrfGuard, JwtAuthGuard)
  logout(@Res() res: Response) {
    try {
      // Clear the cookie
      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        signed: true
      });

      return res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.log(error)
      throw new BadRequestException("Logout failed, please try again");
    }
  }

  @Get("csrf-token")
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    let secret = req.signedCookies["csrf_secret"];
    if (!secret) {
      secret = this.csrfService.generateSecret();
      res.cookie("csrf_secret", secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        signed: true,
        // maxAge: 1000 * 60 * 60 * 24 * 7 // 7-day expiry
      });
    }
    const token = this.csrfService.generateToken(secret);
    res.json({ csrfToken: token });
  }

  @Get("check-cookie")
  checkCookie(@Req() req: Request) {
    const result = function() {
      try {
        if (req.signedCookies?.["auth_token"]) {
          return {
            exists: true
          };
        }
        return new UnauthorizedException("This cookie is not authorized");
      } catch (error) {
        return new BadRequestException(error?.message);
      }
    }();
    if (result instanceof HttpException) throw result;
    return result;
  }

  @Get("check-role")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async checkRole(@Req() req: Request) {
    const user: any = req.user;
    const result = await this.authenticationService.checkRole(+user.id);
    if (result instanceof HttpException) {
      throw result;
    }
    return result;
  }

}

import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";


@Injectable()
export class AuthenticationService {
  private client: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    this.client = new OAuth2Client(
      this.configService.getOrThrow("GOOGLE_CLIENT_ID"),
      this.configService.getOrThrow("GOOGLE_CLIENT_SECRET")
    );
  }

  async login(credential: string) {
    // console.log(credential);
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.configService.getOrThrow("GOOGLE_CLIENT_ID")
      });
      const profile = ticket.getPayload();
      //* Login
      let foundUser = await this.prisma.user.findFirst({
        where: {
          email: profile.email
        }
      });

      //* Register
      if (!foundUser) {
        foundUser = await this.prisma.user.create({
          data: {
            account: profile.email,
            email: profile.email,
            avatar: profile.picture,
            name: profile.name,
            type: "google",
          }
        });
      }

      return {
        token: this.jwtService.sign({
          id: foundUser.id,
          role : foundUser.role
        }),
      };
    } catch (err) {
      return new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }

  async checkRole(userId : number) {
    try {
      const user = await this.prisma.user.findFirst({
        where : { id: userId}
      })
      return {role : user.role};
    }catch (err) {
      return new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }
}

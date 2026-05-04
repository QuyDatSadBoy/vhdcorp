import { IsEmpty, IsString } from "class-validator";

export class CreateUserDto {
  @IsEmpty()
  @IsString()
  type: string;

  @IsEmpty()
  @IsString()
  account: string;

  @IsEmpty()
  @IsString()
  username: string;

  constructor(type: string, account: string, username: string) {
    this.type = type;
    this.account = account;
    this.username = username;
  }
}

import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}

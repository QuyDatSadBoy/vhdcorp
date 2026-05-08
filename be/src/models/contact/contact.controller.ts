import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { Public } from "@decorator/public.decorator";

@Controller("contact")
@ApiTags("Contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: CreateContactDto) {
    return this.contactService.submit(dto);
  }
}

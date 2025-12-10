import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { HttpModule } from '@nestjs/axios'; // Dùng để gọi API nếu không dùng thư viện googleapis
import { MongooseModule } from '@nestjs/mongoose';
import { LinkedAccount, LinkedAccountSchema } from '../auth/linked-account.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: LinkedAccount.name, schema: LinkedAccountSchema },
    ]),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
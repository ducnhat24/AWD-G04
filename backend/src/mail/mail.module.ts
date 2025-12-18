import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LinkedAccount,
  LinkedAccountSchema,
} from '../user/entities/linked-account.entity';
import { ConfigModule } from '@nestjs/config';
import {
  EmailSummary,
  EmailSummarySchema,
} from './entities/email-summary.schema';
import {
  EmailMetadata,
  EmailMetadataSchema,
} from './entities/email-metadata.schema';
import { GmailIntegrationService } from './services/gmail-integration.service';
import { MailSyncService } from './services/mail-sync.service';
import { MailSearchService } from './services/mail-search.service';
import { MailRepository } from './mail.repository';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: LinkedAccount.name, schema: LinkedAccountSchema },
      { name: EmailSummary.name, schema: EmailSummarySchema },
      { name: EmailMetadata.name, schema: EmailMetadataSchema },
    ]),
  ],
  controllers: [MailController],
  providers: [
    MailService,
    GmailIntegrationService,
    MailSyncService,
    MailSearchService,
    MailRepository
  ],
  exports: [MailService],
})
export class MailModule { }

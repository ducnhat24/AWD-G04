import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Các Module con
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { SnoozeLogModule } from './snooze-log/snooze-log.module';
import { KanbanModule } from './kanban/kanban.module';

import { SeedController } from './seed.controller';
import {
  EmailMetadata,
  EmailMetadataSchema,
} from './mail/entities/email-metadata.schema';
import { User, UserSchema } from './user/entities/user.entity';
import {
  KanbanConfig,
  KanbanConfigSchema,
} from './kanban/entities/kanban-config.entity';
import {
  LinkedAccount,
  LinkedAccountSchema,
} from './user/entities/linked-account.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: EmailMetadata.name, schema: EmailMetadataSchema },
      { name: KanbanConfig.name, schema: KanbanConfigSchema },
      { name: LinkedAccount.name, schema: LinkedAccountSchema },
    ]),

    UserModule,
    AuthModule,
    MailModule,
    SnoozeLogModule,
    KanbanModule,
  ],
  controllers: [AppController, SeedController],
  providers: [AppService],
})
export class AppModule {}

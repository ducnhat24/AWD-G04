import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { LinkedAccount, LinkedAccountSchema } from './entities/linked-account.entity';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from './repositories/user.repository';
import { LinkedAccountRepository } from './repositories/linked-account.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: LinkedAccount.name, schema: LinkedAccountSchema },
    ]),
    JwtModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, LinkedAccountRepository],
  exports: [UserService, LinkedAccountRepository],
})
export class UserModule { }

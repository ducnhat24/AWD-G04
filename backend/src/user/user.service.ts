import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private jwtService: JwtService,
  ) { }

  async register(registerUserDto: RegisterUserDto): Promise<UserDocument> {
    const { email, password } = registerUserDto;

    // 1. Check for existing email
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      // 2. Error Handling: Trả về lỗi rõ ràng
      throw new ConflictException('Email already exists');
    }

    // 3. Hash passwords before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create new user
    return this.userRepository.createUser({
      email,
      password: hashedPassword,
    });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findById(id);
  }

  async createByGoogle(email: string, name: string, avatar: string): Promise<UserDocument> {
    // random pass
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    return this.userRepository.createUser({
      email,
      password: hashedPassword,
      name,
      avatar,
    });
  }
}

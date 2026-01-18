import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LinkedAccountRepository } from '../user/repositories/linked-account.repository';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { MailService } from '../mail/mail.service';
import { UserDocument } from '../user/entities/user.entity';
import { Types } from 'mongoose';

interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private linkedAccountRepository: LinkedAccountRepository,
    private mailService: MailService,
  ) { }

  async login(loginDto: LoginUserDto) {
    // 1. Tìm user
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 2. So sánh mật khẩu
    const isPasswordMatching = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      );

      const accessTokenPayload = { sub: payload.sub, email: payload.email };
      const accessToken = await this.jwtService.signAsync(accessTokenPayload);
      return { accessToken };
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      email: user.email,
      sub: (user._id as Types.ObjectId).toString(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async loginWithGoogle(code: string) {
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const googleRes = await axios.post(
        tokenUrl,
        {
          code,
          client_id: this.configService.get('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
          redirect_uri: this.configService.get('GOOGLE_REDIRECT_URI'),
          grant_type: 'authorization_code',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const googleData = googleRes.data as GoogleTokenResponse;

      // Decode id_token để lấy info user
      const googleUser = jwtDecode<GoogleUser>(googleData.id_token);
      const { sub: googleId, email, name, picture } = googleUser;

      const access_token = String(googleData.access_token);

      const refresh_token = googleData.refresh_token
        ? String(googleData.refresh_token)
        : undefined;

      const linkedAccount =
        await this.linkedAccountRepository.findByProviderAndId(
          'google',
          googleId,
        );

      let user: UserDocument | null = null;

      if (linkedAccount) {
        // Case A: Đã link trước đó -> Lấy user ra
        const userId = linkedAccount.user as unknown as Types.ObjectId;
        user = await this.userService.findById(userId.toString());

        await this.linkedAccountRepository.updateTokens(
          linkedAccount._id as Types.ObjectId,
          access_token,
          refresh_token,
        );
      } else {
        // Case B: Chưa link -> Check xem email đã có trong bảng User chưa
        user = await this.userService.findByEmail(email);

        if (!user) {
          user = await this.userService.createByGoogle(
            email,
            name,
            picture ?? '',
          );
        }

        if (!user) {
          throw new UnauthorizedException('Failed to create or find user');
        }

        await this.linkedAccountRepository.create({
          user: user._id as any, // Mongoose accepts ObjectId even though type says User
          provider: 'google',
          providerId: googleId,
          accessToken: access_token,
          refreshToken: refresh_token,
        });
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      this.mailService
        .syncEmailsForUser((user._id as Types.ObjectId).toString())
        .then(() =>
          console.log(`[Initial Sync] Started for user ${user.email}`),
        )
        .catch((err) => console.error(`[Initial Sync] Error:`, err));

      return this.generateTokens(user);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: any } };
      const errorResponse = err.response;
      const errorStatus = errorResponse?.status;
      const errorData: unknown = errorResponse?.data;
      console.error('============ GOOGLE ERROR LOG ============');
      console.error('Status:', errorStatus);
      console.error('Data:', JSON.stringify(errorData));
      console.error(
        'Config Redirect URI:',
        this.configService.get('GOOGLE_REDIRECT_URI'),
      );
      console.error('==========================================');
      throw new UnauthorizedException('Google authentication failed');
    }
  }
}

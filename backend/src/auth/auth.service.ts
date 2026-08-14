import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Atomic transaction: Create store first, then create admin user
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: dto.storeName,
        },
      });

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

      const adminUser = await tx.user.create({
        data: {
          name: dto.adminName,
          email: dto.adminEmail,
          passwordHash,
          role: Role.ADMIN,
          storeId: store.id,
        },
      });

      const tokens = await this.generateTokens({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        storeId: adminUser.storeId,
      });

      await tx.user.update({
        where: { id: adminUser.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return {
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          storeId: adminUser.storeId,
        },
        store: {
          id: store.id,
          name: store.name,
        },
        ...tokens,
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { store: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
      store: {
        id: user.store.id,
        name: user.store.name,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, incomingRefreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken || user.refreshToken !== incomingRefreshToken) {
      throw new UnauthorizedException('Access denied - invalid refresh token');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { success: true };
  }

  private async generateTokens(payload: {
    id: string;
    email: string;
    role: string;
    storeId: string;
  }) {
    const jwtPayload = {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      storeId: payload.storeId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key_kiranaos_2026_dev',
        expiresIn: (process.env.JWT_EXPIRATION || '15m') as any,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_kiranaos_2026_dev',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}

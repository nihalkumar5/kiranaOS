"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.adminEmail },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Email is already registered');
        }
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
                    role: client_1.Role.ADMIN,
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
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { store: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
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
    async refreshTokens(userId, incomingRefreshToken) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.refreshToken || user.refreshToken !== incomingRefreshToken) {
            throw new common_1.UnauthorizedException('Access denied - invalid refresh token');
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
    async logout(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
        return { success: true };
    }
    async generateTokens(payload) {
        const jwtPayload = {
            sub: payload.id,
            email: payload.email,
            role: payload.role,
            storeId: payload.storeId,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(jwtPayload, {
                secret: process.env.JWT_SECRET || 'super_secret_jwt_key_kiranaos_2026_dev',
                expiresIn: (process.env.JWT_EXPIRATION || '15m'),
            }),
            this.jwtService.signAsync(jwtPayload, {
                secret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_kiranaos_2026_dev',
                expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d'),
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
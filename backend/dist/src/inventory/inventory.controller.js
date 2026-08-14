"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const purchase_entry_dto_1 = require("./dto/purchase-entry.dto");
const audit_adjustment_dto_1 = require("./dto/audit-adjustment.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
let InventoryController = class InventoryController {
    inventoryService;
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async recordPurchase(storeId, userId, dto) {
        const logs = await this.inventoryService.recordPurchase(storeId, userId, dto);
        return {
            success: true,
            message: 'Purchase entries recorded and stock updated successfully',
            data: logs,
        };
    }
    async recordAudit(storeId, userId, dto) {
        const log = await this.inventoryService.recordAuditAdjustment(storeId, userId, dto);
        return {
            success: true,
            message: 'Stock audit adjustment applied successfully',
            data: log,
        };
    }
    async getHistory(storeId) {
        const history = await this.inventoryService.getTransactionHistory(storeId);
        return {
            success: true,
            data: history,
        };
    }
    async getLowStock(storeId) {
        const lowStock = await this.inventoryService.getLowStockAlerts(storeId);
        return {
            success: true,
            data: lowStock,
        };
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Post)('purchase'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, get_user_decorator_1.GetUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, purchase_entry_dto_1.PurchaseEntryDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "recordPurchase", null);
__decorate([
    (0, common_1.Post)('audit'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, get_user_decorator_1.GetUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, audit_adjustment_dto_1.AuditAdjustmentDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "recordAudit", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('low-stock'),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getLowStock", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map
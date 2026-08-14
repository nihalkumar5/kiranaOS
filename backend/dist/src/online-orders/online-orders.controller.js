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
exports.OnlineOrdersController = void 0;
const common_1 = require("@nestjs/common");
const online_orders_service_1 = require("./online-orders.service");
const update_online_order_status_dto_1 = require("./dto/update-online-order-status.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
let OnlineOrdersController = class OnlineOrdersController {
    onlineOrdersService;
    constructor(onlineOrdersService) {
        this.onlineOrdersService = onlineOrdersService;
    }
    async getOnlineOrders(storeId) {
        const orders = await this.onlineOrdersService.findAll(storeId);
        return {
            success: true,
            data: orders,
        };
    }
    async updateOrderStatus(storeId, userId, id, dto) {
        const order = await this.onlineOrdersService.updateStatus(storeId, userId, id, dto.status);
        return {
            success: true,
            message: `Order status updated to ${dto.status}`,
            data: order,
        };
    }
};
exports.OnlineOrdersController = OnlineOrdersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnlineOrdersController.prototype, "getOnlineOrders", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, get_user_decorator_1.GetUser)('id')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_online_order_status_dto_1.UpdateOnlineOrderStatusDto]),
    __metadata("design:returntype", Promise)
], OnlineOrdersController.prototype, "updateOrderStatus", null);
exports.OnlineOrdersController = OnlineOrdersController = __decorate([
    (0, common_1.Controller)('online-orders'),
    __metadata("design:paramtypes", [online_orders_service_1.OnlineOrdersService])
], OnlineOrdersController);
//# sourceMappingURL=online-orders.controller.js.map
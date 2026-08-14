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
exports.PublicStoreController = void 0;
const common_1 = require("@nestjs/common");
const online_orders_service_1 = require("./online-orders.service");
const create_online_order_dto_1 = require("./dto/create-online-order.dto");
let PublicStoreController = class PublicStoreController {
    onlineOrdersService;
    constructor(onlineOrdersService) {
        this.onlineOrdersService = onlineOrdersService;
    }
    async getPublicProducts(storeId) {
        const products = await this.onlineOrdersService.getPublicStoreProducts(storeId);
        return { success: true, data: products };
    }
    async createOnlineOrder(storeId, dto) {
        const order = await this.onlineOrdersService.createOnlineOrder(storeId, dto);
        return {
            success: true,
            message: 'Online order placed successfully! Please visit the store for pickup.',
            data: order,
        };
    }
};
exports.PublicStoreController = PublicStoreController;
__decorate([
    (0, common_1.Get)(':storeId/products'),
    __param(0, (0, common_1.Param)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicStoreController.prototype, "getPublicProducts", null);
__decorate([
    (0, common_1.Post)(':storeId/orders'),
    __param(0, (0, common_1.Param)('storeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_online_order_dto_1.CreateOnlineOrderDto]),
    __metadata("design:returntype", Promise)
], PublicStoreController.prototype, "createOnlineOrder", null);
exports.PublicStoreController = PublicStoreController = __decorate([
    (0, common_1.Controller)('store'),
    __metadata("design:paramtypes", [online_orders_service_1.OnlineOrdersService])
], PublicStoreController);
//# sourceMappingURL=public-store.controller.js.map
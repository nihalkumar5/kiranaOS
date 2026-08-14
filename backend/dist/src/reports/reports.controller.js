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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const create_cash_tally_dto_1 = require("./dto/create-cash-tally.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const get_user_decorator_1 = require("../auth/decorators/get-user.decorator");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getSalesAggregate(storeId, startDate, endDate) {
        const data = await this.reportsService.getSalesAggregate(storeId, startDate, endDate);
        return {
            success: true,
            data,
        };
    }
    async exportCsv(storeId, startDate, endDate, res) {
        const csv = await this.reportsService.exportSalesCsv(storeId, startDate, endDate);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report_${Date.now()}.csv`);
        return res.send(csv);
    }
    async createCashTally(storeId, userId, dto) {
        const tally = await this.reportsService.createCashTally(storeId, userId, dto);
        return {
            success: true,
            message: 'Cash Tally audit record logged successfully',
            data: tally,
        };
    }
    async getCashTallies(storeId) {
        const tallies = await this.reportsService.getCashTallies(storeId);
        return {
            success: true,
            data: tallies,
        };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('sales-aggregate'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getSalesAggregate", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Post)('cash-tally'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __param(1, (0, get_user_decorator_1.GetUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_cash_tally_dto_1.CreateCashTallyDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "createCashTally", null);
__decorate([
    (0, common_1.Get)('cash-tally'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, get_user_decorator_1.GetUser)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getCashTallies", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map
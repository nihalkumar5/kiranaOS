import { Module } from '@nestjs/common';
import { OnlineOrdersService } from './online-orders.service';
import { OnlineOrdersController } from './online-orders.controller';
import { PublicStoreController } from './public-store.controller';

@Module({
  controllers: [OnlineOrdersController, PublicStoreController],
  providers: [OnlineOrdersService],
})
export class OnlineOrdersModule {}

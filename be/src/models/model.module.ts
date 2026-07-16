import { Module } from '@nestjs/common';
import { UserModule } from '@model/user/user.module';
import { CategoryModule } from '@model/category/category.module';
import { ProductModule } from '@model/product/product.module';
import { PostModule } from '@model/post/post.module';
import { ReviewModule } from '@model/review/review.module';
import { BannerModule } from '@model/banner/banner.module';
import { OrderModule } from '@model/order/order.module';
import { VoucherModule } from '@model/voucher/voucher.module';
import { MediaModule } from '@model/media/media.module';
import { SiteConfigModule } from '@model/site-config/site-config.module';
import { StatisticsModule } from '@model/statistics/statistics.module';
import { ContactModule } from '@model/contact/contact.module';
import { TrackModule } from '@model/track/track.module';

@Module({
  imports: [
    UserModule,
    CategoryModule,
    ProductModule,
    PostModule,
    ReviewModule,
    BannerModule,
    OrderModule,
    VoucherModule,
    MediaModule,
    SiteConfigModule,
    StatisticsModule,
    ContactModule,
    TrackModule,
  ],
  exports: [
    UserModule,
    CategoryModule,
    ProductModule,
    PostModule,
    ReviewModule,
    BannerModule,
    OrderModule,
    VoucherModule,
    MediaModule,
    SiteConfigModule,
    StatisticsModule,
    ContactModule,
    TrackModule,
  ],
})
export class ModelModule {}

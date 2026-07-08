import { Module } from '@nestjs/common';
import { UserModule } from '@model/user/user.module';
import { CategoryModule } from '@model/category/category.module';
import { ProductModule } from '@model/product/product.module';
import { PostModule } from '@model/post/post.module';
import { ReviewModule } from '@model/review/review.module';
import { BannerModule } from '@model/banner/banner.module';
import { MediaModule } from '@model/media/media.module';
import { SiteConfigModule } from '@model/site-config/site-config.module';
import { StatisticsModule } from '@model/statistics/statistics.module';
import { ContactModule } from '@model/contact/contact.module';

@Module({
  imports: [
    UserModule,
    CategoryModule,
    ProductModule,
    PostModule,
    ReviewModule,
    BannerModule,
    MediaModule,
    SiteConfigModule,
    StatisticsModule,
    ContactModule,
  ],
  exports: [
    UserModule,
    CategoryModule,
    ProductModule,
    PostModule,
    ReviewModule,
    BannerModule,
    MediaModule,
    SiteConfigModule,
    StatisticsModule,
    ContactModule,
  ],
})
export class ModelModule {}

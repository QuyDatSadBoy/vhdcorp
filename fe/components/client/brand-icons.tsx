/**
 * Icon thương hiệu VHD — dùng bộ Phosphor Icons bản DUOTONE (thư viện icon
 * chuyên nghiệp, 9k★, được designer dùng rộng rãi) thay outline mảnh nhìn generic.
 * Tree-shaken: chỉ icon import mới vào bundle (~1-2KB/icon). Dùng y hệt lucide:
 * <IconShield className="h-4 w-4" />.
 */
import {
  ShieldCheckIcon,
  TruckIcon,
  HeadsetIcon,
  MedalIcon,
  StarIcon,
  ClockIcon,
  LeafIcon,
  ThumbsUpIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";

type P = Omit<ComponentProps<typeof ShieldCheckIcon>, "weight">;

export const IconShield = (p: P) => <ShieldCheckIcon weight="duotone" {...p} />;
export const IconTruck = (p: P) => <TruckIcon weight="duotone" {...p} />;
export const IconHeadset = (p: P) => <HeadsetIcon weight="duotone" {...p} />;
export const IconMedal = (p: P) => <MedalIcon weight="duotone" {...p} />;
export const IconStar = (p: P) => <StarIcon weight="duotone" {...p} />;
export const IconClock = (p: P) => <ClockIcon weight="duotone" {...p} />;
export const IconLeaf = (p: P) => <LeafIcon weight="duotone" {...p} />;
export const IconThumbsUp = (p: P) => <ThumbsUpIcon weight="duotone" {...p} />;
export const IconSpark = (p: P) => <SparkleIcon weight="duotone" {...p} />;

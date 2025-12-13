import { DiscountType } from "./create-coupon.dto"

export interface couponResponse {
    id: string
    code: string
    discountType: DiscountType
    discountValue: string
    minOrderValue?: string
    maxUsage?: number
    maxUsagePerUser?: number
    expiresAt?: Date
    usageCount: number
    isActive: boolean
}
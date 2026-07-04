import { VoucherType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateVoucherDto {
  // Uppercase alphanumeric (plus - and _) — the exact string customers type.
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,32}$/, {
    message: 'code must be 3-32 chars: A-Z, 0-9, - or _',
  })
  code!: string;

  @IsEnum(VoucherType)
  type!: VoucherType;

  // PERCENT: whole percent of subtotal (1-100, upper bound checked in service).
  // FIXED: discount in sen.
  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minSpendSen?: number;
}

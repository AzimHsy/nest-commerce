import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  // Money is integer sen everywhere (architecture invariant 1). Min(0) — no
  // negative prices; class-validator IsInt rejects strings/floats.
  @IsInt()
  @Min(0)
  priceSen!: number;

  @IsInt()
  @Min(0)
  stockQty!: number;
}

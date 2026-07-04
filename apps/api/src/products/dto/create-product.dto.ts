import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Free-form per spec: "may be empty or point anywhere" — plain string, not IsUrl.
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

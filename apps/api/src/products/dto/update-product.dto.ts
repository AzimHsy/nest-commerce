import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// PartialType makes every field optional for PATCH. Spring analogy: a partial
// update DTO where all Bean Validation constraints still apply to present fields.
export class UpdateProductDto extends PartialType(CreateProductDto) {}

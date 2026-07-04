import { IsEmail, IsString, MinLength } from 'class-validator';

// Spring analogy: like a @RequestBody POJO with Bean Validation annotations.
// The global ValidationPipe rejects anything that fails these before the
// controller runs, and strips unknown properties (whitelist).
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

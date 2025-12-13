import { AuthResponse } from './dto';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcrypt';
import { UserWithoutPassword } from 'src/database/schema';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * --------------- Register a new user -----------------
   * @param registerDto
   * @returns Promise<AuthResponse>
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const existingUser = await this.userService.findByEmail(
        registerDto.email,
      );
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      const user = await this.userService.create({
        ...registerDto,
        password: hashedPassword,
      });

      const { password, ...userWithoutPassword } = user;
      const access_token = this.generateToken(user.id, user.email, user.role);

      return {
        user: userWithoutPassword,
        access_token,
      };
    } catch (error) {
      this.logger.error('Error registering user', error.message);
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * --------------- Login User -----------------
   * @param loginDto
   * @returns Promise<AuthResponse>
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.userService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const { password, ...userWithoutPassword } = user;
      const access_token = this.generateToken(user.id, user.email, user.role);

      return {
        user: userWithoutPassword,
        access_token,
      };
    } catch (error) {
      this.logger.error('Error logging in user',  error.message);
      if(error instanceof UnauthorizedException){
        throw new UnauthorizedException(error.message)
      }
      else{
        throw new Error(error)
      }
    }
  }

  /**
   * --------------- Validate User -----------------
   * @param userId
   * @returns Promise<User>
   */
  async validateUser(userId: string): Promise<UserWithoutPassword | null> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new UnauthorizedException();
      }
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Error validating user', error.message);
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(error.message);
      } else {
        throw new Error(error);
      }
    }
  }

  /**
   * --------------- Generate Token -----------------
   * @param userId
   * @param email
   * @param role
   * @returns string
   */
  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}

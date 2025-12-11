// Create a new file: dto/auth-response.dto.ts
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  access_token: string;
}

export interface userWithoutPassword {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

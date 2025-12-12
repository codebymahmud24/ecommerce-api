// Create a new file: dto/auth-response.dto.ts
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  access_token: string;
}

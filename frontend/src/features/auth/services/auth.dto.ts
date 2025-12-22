export type LoginRequestDto = {
  email: string;
  password: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
};

export type LoginResponseDto = {
  accessToken: string;
  refreshToken: string;
};

export type RefreshResponseDto = {
  accessToken: string;
};

export type RefreshRequestDto = {
  refreshToken: string;
};

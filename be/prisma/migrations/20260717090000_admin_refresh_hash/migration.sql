-- Phiên quản trị dùng refresh hash RIÊNG, không đè phiên khách (2 tab không thu hồi lẫn nhau)
ALTER TABLE "User" ADD COLUMN "adminRefreshTokenHash" TEXT;

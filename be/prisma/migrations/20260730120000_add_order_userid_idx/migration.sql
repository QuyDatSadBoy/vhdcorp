-- Thêm index cho Order.userId (truy vấn /orders/mine lọc theo userId) — tránh seq scan.
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

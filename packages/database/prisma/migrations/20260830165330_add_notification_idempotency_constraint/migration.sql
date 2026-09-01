-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_order_id_channel_event_type_key" ON "notification_logs"("order_id", "channel", "event_type");

-- ============================================================
-- SmartPrint – Complete MySQL Schema
-- Phase 1 – All 18 tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS smartprint
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartprint;

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id      VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(512) NOT NULL,
  role           ENUM('SUPER_ADMIN','OWNER','MANAGER','STAFF') NOT NULL DEFAULT 'OWNER',
  status         ENUM('ACTIVE','INACTIVE','SUSPENDED','PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
  email_verified TINYINT(1)   NOT NULL DEFAULT 0,
  last_login_at  DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- refresh_tokens
-- ============================================================
CREATE TABLE refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(512) NOT NULL,
  expires_at DATETIME     NOT NULL,
  revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_tokens_token (token),
  INDEX idx_refresh_tokens_user_id (user_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- shops
-- ============================================================
CREATE TABLE shops (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id  VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  shop_code  VARCHAR(16)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  address    TEXT         NULL,
  phone      VARCHAR(32)  NULL,
  email      VARCHAR(255) NULL,
  logo_url   VARCHAR(512) NULL,
  agent_token VARCHAR(64) NULL,
  subscription_tier VARCHAR(32) NOT NULL DEFAULT 'FREE',
  status     ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shops_public_id (public_id),
  UNIQUE KEY uq_shops_shop_code (shop_code),
  UNIQUE KEY uq_shops_agent_token (agent_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- shop_users
-- ============================================================
CREATE TABLE shop_users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  role       ENUM('OWNER','MANAGER','STAFF') NOT NULL DEFAULT 'OWNER',
  status     ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_users (shop_id, user_id),
  INDEX idx_shop_users_shop_id (shop_id),
  INDEX idx_shop_users_user_id (user_id),
  CONSTRAINT fk_shop_users_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_users_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- shop_settings
-- ============================================================
CREATE TABLE shop_settings (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id                INT UNSIGNED NOT NULL,
  payment_enabled        TINYINT(1)   NOT NULL DEFAULT 0,
  manual_print_enabled   TINYINT(1)   NOT NULL DEFAULT 1,
  direct_print_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
  default_expiry_hours   INT          NOT NULL DEFAULT 24,
  enabled_expiry_options VARCHAR(255) NOT NULL DEFAULT '15m,1h,3h,8h',
  default_expiry_option  VARCHAR(32)  NOT NULL DEFAULT '1h',
  max_expiry_hours       INT          NOT NULL DEFAULT 8,
  razorpay_key_id        VARCHAR(255) NULL,
  razorpay_key_secret    VARCHAR(255) NULL,
  razorpay_webhook_secret VARCHAR(255) NULL,
  max_upload_size_mb     INT          NOT NULL DEFAULT 50,
  accepted_formats       VARCHAR(512) NOT NULL DEFAULT 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png',
  currency               VARCHAR(8)   NOT NULL DEFAULT 'INR',
  timezone               VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_settings_shop_id (shop_id),
  CONSTRAINT fk_shop_settings_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- customer_sessions
-- ============================================================
CREATE TABLE customer_sessions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id      VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  shop_id        INT UNSIGNED NOT NULL,
  session_token  VARCHAR(512) NOT NULL,
  customer_name  VARCHAR(255) NULL,
  customer_phone VARCHAR(32)  NULL,
  status         ENUM('ACTIVE','EXPIRED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  expires_at     DATETIME     NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_sessions_public_id (public_id),
  UNIQUE KEY uq_customer_sessions_token (session_token),
  INDEX idx_customer_sessions_shop_id (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE orders (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id    VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  order_number VARCHAR(32)  NOT NULL,
  shop_id      INT UNSIGNED NOT NULL,
  session_id   INT UNSIGNED NULL,
  status       ENUM('PENDING','CONFIRMED','PAYMENT_PENDING','ACCEPTED','PROCESSING','PRINTING','PRINTED','READY','COLLECTED','COMPLETED','REJECTED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes        TEXT          NULL,
  expires_at   DATETIME      NULL,
  expiry_option VARCHAR(32)   NULL DEFAULT '1h',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_public_id (public_id),
  UNIQUE KEY uq_orders_order_number (order_number),
  INDEX idx_orders_shop_id (shop_id),
  INDEX idx_orders_session_id (session_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_expires_at (expires_at),
  INDEX idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_shop    FOREIGN KEY (shop_id)    REFERENCES shops (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES customer_sessions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- order_files
-- ============================================================
CREATE TABLE order_files (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  order_id        INT UNSIGNED  NOT NULL,
  original_name   VARCHAR(512)  NOT NULL,
  storage_path    VARCHAR(1024) NOT NULL,
  mime_type       VARCHAR(128)  NOT NULL,
  file_size_bytes BIGINT        NOT NULL,
  page_count      INT           NULL,
  status          ENUM('UPLOADED','PROCESSING','READY','PRINTING','PRINTED','FAILED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'UPLOADED',
  expires_at      DATETIME      NULL,
  deleted_at      DATETIME      NULL,
  is_purged       TINYINT(1)    NOT NULL DEFAULT 0,
  uploaded_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_files_public_id (public_id),
  INDEX idx_order_files_order_id (order_id),
  INDEX idx_order_files_expires_at (expires_at),
  CONSTRAINT fk_order_files_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- print_configurations
-- ============================================================
CREATE TABLE print_configurations (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_id          INT UNSIGNED NOT NULL,
  copies           INT          NOT NULL DEFAULT 1,
  color_mode       ENUM('COLOR','BLACK_WHITE','GRAYSCALE') NOT NULL DEFAULT 'BLACK_WHITE',
  paper_size       ENUM('A4','A3','A5','LETTER','LEGAL','CUSTOM') NOT NULL DEFAULT 'A4',
  paper_type       ENUM('NORMAL','PREMIUM','PHOTO','BOND','GLOSSY','CUSTOM') NOT NULL DEFAULT 'NORMAL',
  orientation      ENUM('PORTRAIT','LANDSCAPE') NOT NULL DEFAULT 'PORTRAIT',
  duplex_mode      ENUM('SIMPLEX','DUPLEX_LONG_EDGE','DUPLEX_SHORT_EDGE') NOT NULL DEFAULT 'SIMPLEX',
  pages_per_sheet  INT           NOT NULL DEFAULT 1,
  page_range       VARCHAR(255)  NULL,
  binding_type     ENUM('NONE','SPIRAL','STAPLE','PERFECT') NOT NULL DEFAULT 'NONE',
  lamination_type  ENUM('NONE','GLOSS','MATTE') NOT NULL DEFAULT 'NONE',
  unit_price       DECIMAL(10,2) NOT NULL,
  calculated_total DECIMAL(10,2) NOT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_print_configurations_file_id (file_id),
  CONSTRAINT fk_print_configurations_file FOREIGN KEY (file_id) REFERENCES order_files (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- pricing_rules
-- ============================================================
CREATE TABLE pricing_rules (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id        INT UNSIGNED NOT NULL,
  name           VARCHAR(255) NOT NULL,
  color_mode     ENUM('COLOR','BLACK_WHITE','GRAYSCALE') NOT NULL,
  paper_size     ENUM('A4','A3','A5','LETTER','LEGAL','CUSTOM') NOT NULL,
  duplex_mode    ENUM('SIMPLEX','DUPLEX_LONG_EDGE','DUPLEX_SHORT_EDGE') NOT NULL,
  price_per_page DECIMAL(10,2) NOT NULL,
  min_pages      INT           NOT NULL DEFAULT 1,
  max_pages      INT           NULL,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pricing_rules_shop_id (shop_id),
  CONSTRAINT fk_pricing_rules_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- additional_services
-- ============================================================
CREATE TABLE additional_services (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT          NULL,
  price       DECIMAL(10,2) NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_additional_services_shop_id (shop_id),
  CONSTRAINT fk_additional_services_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- order_file_services
-- ============================================================
CREATE TABLE order_file_services (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_id               INT UNSIGNED NOT NULL,
  additional_service_id INT UNSIGNED NOT NULL,
  quantity              INT           NOT NULL DEFAULT 1,
  unit_price            DECIMAL(10,2) NOT NULL,
  total                 DECIMAL(10,2) NOT NULL,
  UNIQUE KEY uq_order_file_services (file_id, additional_service_id),
  INDEX idx_order_file_services_file_id (file_id),
  CONSTRAINT fk_ofs_file    FOREIGN KEY (file_id)               REFERENCES order_files (id)         ON DELETE CASCADE,
  CONSTRAINT fk_ofs_service FOREIGN KEY (additional_service_id) REFERENCES additional_services (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE payments (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  order_id            INT UNSIGNED  NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  method              ENUM('CASH','UPI','CARD','NETBANKING','WALLET','RAZORPAY','COUNTER') NOT NULL DEFAULT 'CASH',
  status              ENUM('PENDING','SUCCESS','COMPLETED','FAILED','REFUNDED','CANCELLED','COUNTER_PAYMENT_DUE','COUNTER_PAYMENT_COLLECTED') NOT NULL DEFAULT 'PENDING',
  reference_id        VARCHAR(255)  NULL,
  razorpay_order_id   VARCHAR(255)  NULL,
  razorpay_payment_id VARCHAR(255)  NULL,
  razorpay_signature  VARCHAR(255)  NULL,
  notes               TEXT          NULL,
  gateway_response    JSON          NULL,
  paid_at             DATETIME      NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payments_public_id (public_id),
  INDEX idx_payments_order_id (order_id),
  INDEX idx_payments_razorpay_order_id (razorpay_order_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- printers
-- ============================================================
CREATE TABLE printers (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  shop_id         INT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL,
  model           VARCHAR(255) NULL,
  ip_address      VARCHAR(45)  NULL,
  status          ENUM('ONLINE','OFFLINE','BUSY','ERROR') NOT NULL DEFAULT 'OFFLINE',
  capabilities    JSON         NULL,
  is_default      TINYINT(1)   NOT NULL DEFAULT 0,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  last_seen_at    DATETIME     NULL,
  connection_type VARCHAR(64)  NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_printers_public_id (public_id),
  INDEX idx_printers_shop_id (shop_id),
  CONSTRAINT fk_printers_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- print_jobs
-- ============================================================
CREATE TABLE print_jobs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id       VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  file_id         INT UNSIGNED NOT NULL,
  printer_id      INT UNSIGNED NULL,
  status          ENUM('QUEUED','DOWNLOADED','SUBMITTED_TO_OS','DRIVER_COMPLETED','MANUALLY_CONFIRMED','SENDING','PRINTING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'QUEUED',
  attempt_number  INT          NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(64)  NULL,
  job_ticket      JSON         NULL,
  agent_notes     TEXT         NULL,
  started_at      DATETIME     NULL,
  completed_at    DATETIME     NULL,
  error_message   TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_print_jobs_public_id (public_id),
  UNIQUE KEY uq_print_jobs_idempotency (idempotency_key),
  INDEX idx_print_jobs_file_id (file_id),
  INDEX idx_print_jobs_printer_id (printer_id),
  CONSTRAINT fk_print_jobs_file    FOREIGN KEY (file_id)    REFERENCES order_files (id) ON DELETE CASCADE,
  CONSTRAINT fk_print_jobs_printer FOREIGN KEY (printer_id) REFERENCES printers (id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- order_status_logs
-- ============================================================
CREATE TABLE order_status_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL,
  from_status ENUM('PENDING','CONFIRMED','PAYMENT_PENDING','ACCEPTED','PROCESSING','PRINTING','PRINTED','READY','COLLECTED','COMPLETED','REJECTED','CANCELLED','EXPIRED') NULL,
  to_status   ENUM('PENDING','CONFIRMED','PAYMENT_PENDING','ACCEPTED','PROCESSING','PRINTING','PRINTED','READY','COLLECTED','COMPLETED','REJECTED','CANCELLED','EXPIRED') NOT NULL,
  note        TEXT         NULL,
  changed_by  INT UNSIGNED NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_status_logs_order_id (order_id),
  CONSTRAINT fk_order_status_logs_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- expiry_logs
-- ============================================================
CREATE TABLE expiry_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id      INT UNSIGNED NULL,
  order_id        INT UNSIGNED NULL,
  file_id         INT UNSIGNED NULL,
  action          VARCHAR(64)  NOT NULL DEFAULT 'AUTO_EXPIRED',
  previous_expiry DATETIME     NULL,
  new_expiry      DATETIME     NULL,
  expired_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  files_count     INT          NOT NULL DEFAULT 0,
  bytes_freed     BIGINT       NOT NULL DEFAULT 0,
  reason          VARCHAR(255) NULL,
  performed_by    INT UNSIGNED NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expiry_logs_session_id (session_id),
  INDEX idx_expiry_logs_order_id (order_id),
  INDEX idx_expiry_logs_action (action),
  CONSTRAINT fk_expiry_logs_session FOREIGN KEY (session_id) REFERENCES customer_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_expiry_logs_order   FOREIGN KEY (order_id)   REFERENCES orders (id)            ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  shop_id    INT UNSIGNED NULL,
  type       VARCHAR(64)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  data       JSON         NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  read_at    DATETIME     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_shop_id (shop_id),
  INDEX idx_notifications_is_read (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  shop_id     INT UNSIGNED NULL,
  action      VARCHAR(128) NOT NULL,
  resource    VARCHAR(128) NOT NULL,
  resource_id VARCHAR(64)  NULL,
  old_data    JSON         NULL,
  new_data    JSON         NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(512) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_shop_id (shop_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_logs_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SmartPrint – Initial Migration
-- Phase 1 – All 18 tables
-- Run: npx prisma migrate dev --name init
-- Or apply manually: mysql -u root -p smartprint < 001_init.sql
-- ============================================================

-- This file mirrors schema.sql for reference.
-- Use `npx prisma migrate dev` for the managed workflow.

SOURCE ../schema.sql;

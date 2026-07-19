INSERT INTO super_admins (email, password_hash, first_name, last_name, is_active, permissions, created_at, updated_at) 
VALUES ('super@test.com', '$2a$10$Fuc9OSrV6FmKieHyejP8QOF2umscTvg6prZbPFV.vIQ7yy5JJo.Ym', 'Super', 'Admin', true, '{"*"}', NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO arena_admins (email, password_hash, first_name, last_name, arena_id, is_active, created_by, created_at, updated_at) 
VALUES ('arena@test.com', '$2a$10$Fuc9OSrV6FmKieHyejP8QOF2umscTvg6prZbPFV.vIQ7yy5JJo.Ym', 'Arena', 'Admin', 1, true, 1, NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO security_staff (email, password_hash, first_name, last_name, arena_id, is_active, created_by, created_at, updated_at) 
VALUES ('security@test.com', '$2a$10$Fuc9OSrV6FmKieHyejP8QOF2umscTvg6prZbPFV.vIQ7yy5JJo.Ym', 'Security', 'Guard', 1, true, 1, NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- À exécuter dans la console SQL de Neon

CREATE TABLE IF NOT EXISTS agenda (
  id SERIAL PRIMARY KEY,
  day VARCHAR(5) NOT NULL,
  month VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  venue VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Données initiales
INSERT INTO agenda (day, month, title, venue, status) VALUES
('12', 'Sep 2026', 'Grand Gala de Magie', 'Théâtre du Châtelet — Paris', 'available'),
('28', 'Sep 2026', 'Soirée Privée — Gala Corporate', 'Hôtel Metropole — Bruxelles', 'sold-out'),
('17', 'Oct 2026', 'Festival Internazionale della Magia', 'Palais des Congrès — Lyon', 'available'),
('04', 'Nov 2026', 'Close-Up Night — Session exclusive', 'Bar Secret — Paris 9e', 'available'),
('21', 'Déc 2026', 'Spectacle de Noël — Magie en famille', 'Salle des Fêtes — Bordeaux', 'available');

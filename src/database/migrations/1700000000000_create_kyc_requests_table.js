export const up = async (db) => {
  await db.execute(`
    CREATE TABLE kyc_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      document_type VARCHAR(255) NOT NULL,
      document_number VARCHAR(255) NOT NULL,
      document_front_url VARCHAR(255) NOT NULL,
      document_back_url VARCHAR(255),
      selfie_url VARCHAR(255) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      reviewed_by INT,
      review_comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);
};

export const down = async (db) => {
  await db.execute(`
    DROP TABLE IF EXISTS kyc_requests;
  `);
};

export const up = async (db) => {
  // Drop existing foreign key constraint
  // You might need to adjust the constraint name based on your database's auto-generated name
  // To find the constraint name, run: SHOW CREATE TABLE kyc_requests;
  await db.execute(`
    ALTER TABLE kyc_requests
    DROP FOREIGN KEY kyc_requests_ibfk_1;
  `);

  // Drop user_id column
  await db.execute(`
    ALTER TABLE kyc_requests
    DROP COLUMN user_id;
  `);

  // Add user_uuid column
  await db.execute(`
    ALTER TABLE kyc_requests
    ADD COLUMN user_uuid VARCHAR(36) NOT NULL AFTER id;
  `);

  // Add foreign key constraint to users(uuid)
  await db.execute(`
    ALTER TABLE kyc_requests
    ADD CONSTRAINT fk_user_uuid
    FOREIGN KEY (user_uuid) REFERENCES users(uuid)
    ON DELETE CASCADE ON UPDATE CASCADE;
  `);
};

export const down = async (db) => {
  // Drop new foreign key constraint
  await db.execute(`
    ALTER TABLE kyc_requests
    DROP FOREIGN KEY fk_user_uuid;
  `);

  // Drop user_uuid column
  await db.execute(`
    ALTER TABLE kyc_requests
    DROP COLUMN user_uuid;
  `);

  // Add user_id column back
  await db.execute(`
    ALTER TABLE kyc_requests
    ADD COLUMN user_id INT NOT NULL AFTER id;
  `);

  // Add original foreign key constraint
  // You might need to adjust the constraint name
  await db.execute(`
    ALTER TABLE kyc_requests
    ADD CONSTRAINT kyc_requests_ibfk_1
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;
  `);
};

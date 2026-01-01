import db from "../config/db.js";

export const getAllCompaniesWithOwners = async () => {
  const [rows] = await db.execute(`
    SELECT
      c.id AS company_id,
      c.name AS company_name,
      c.subscription_status,
      c.subscription_expires_at,
      c.created_at AS company_created_at,

      -- ✅ OWNER DETAILS ONLY
      u.id AS owner_id,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name,
      u.email AS owner_email,
      u.mobile AS owner_mobile,
      u.city AS owner_city,
      u.country AS owner_country,
      u.auth_type,
      u.created_at AS owner_created_at

    FROM companies c
    LEFT JOIN users u 
      ON u.company_id = c.id
      AND u.is_company_owner = 1
      AND u.is_deleted = 0

    ORDER BY c.created_at DESC
  `);

  return rows;
};


export const getCompanyOwnerByCompanyId = async (companyId) => {
  const [rows] = await db.execute(`
    SELECT
      -- 👤 OWNER DETAILS
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.mobile,
      u.city,
      u.country,
      u.auth_type,
      u.profile_image,
      u.is_active,
      u.created_at,

      -- 🏢 COMPANY
      c.id AS company_id,
      c.name AS company_name,

      -- 📊 STATS
      (
        SELECT COUNT(*) 
        FROM customers 
        WHERE company_id = c.id
      ) AS total_customers,

      (
        SELECT COUNT(*) 
        FROM meetings 
        WHERE company_id = c.id
      ) AS total_meetings,

      (
        SELECT COUNT(*) 
        FROM users 
        WHERE company_id = c.id
          AND is_company_owner = 0
          AND is_deleted = 0
      ) AS total_exterminators,

      (
        SELECT COUNT(*) 
        FROM photos p
        JOIN meetings m ON m.id = p.meeting_id
        WHERE m.company_id = c.id
      ) AS total_photos

    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.company_id = ?
      AND u.is_company_owner = 1
      AND u.is_deleted = 0
    LIMIT 1
  `, [companyId]);

  return rows[0] || null;
};
  

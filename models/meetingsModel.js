import db from "../config/db.js";

// Add new meeting
export const addMeeting = async (data) => {
  const {
    company_id,
    user_id, // Assigned User ID (maps to exterminator_id)
    created_by, // Creator ID 
    customer_id,
    location_id,
    title,
    description,
    scheduled_date
  } = data;

  const [result] = await db.execute(
    `INSERT INTO meetings 
      (company_id, exterminator_id, created_by, customer_id, location_id, title, description, status, scheduled_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
    [
      company_id,
      user_id,
      created_by,
      customer_id,
      location_id,
      title,
      description,
      scheduled_date
    ]
  );

  return result.insertId;
};


// Update meeting
export const updateMeeting = async (id, data) => {
  const { 
    // Assigned User ID / Exterminator ID
    exterminator_id, 
    customer_id, 
    location_id, 
    title, 
    description, 
    scheduled_date,
    status 
  } = data;

  // ✅ SQL query ko clean string format mein likha gaya hai taake syntax error theek ho jaaye.
  const [result] = await db.execute(
    `
    UPDATE meetings SET 
    exterminator_id = ?, 
    customer_id = ?, 
    location_id = ?, 
    title = ?, 
    description = ?, 
    scheduled_date = ?,
    status = ?
    WHERE id = ?
    `,
    [
      exterminator_id, 
      customer_id, 
      location_id, 
      title, 
      description, 
      scheduled_date,
      status || 'pending', 
      id
    ]
  );
  return result.affectedRows > 0;
};


// Get all meetings with complete joined details (used for list and filters)
export const getMeetings = async (filters = {}) => {
  const { company_id, exterminator_id } = filters;
  const params = [];

  let query = `
    SELECT 
      m.id AS meeting_id,
      m.title,
      m.description,
      m.status,
      m.scheduled_date,
      m.created_at,
      m.company_id,
      m.exterminator_id,
      m.customer_id,
      m.location_id,
      m.created_by,

      CONCAT(u.first_name, ' ', u.last_name) AS exterminator_name,
      u.email AS exterminator_email,
      u.mobile AS exterminator_mobile,

      CONCAT(cb.first_name, ' ', cb.last_name) AS created_by_name,
      cb.email AS created_by_email,

      c.name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.address AS customer_address,

      l.name AS location_name,
      l.address AS location_address,
      l.street AS location_street,
      l.city AS location_city,
      l.state AS location_state,
      l.country AS location_country,
      l.post_code AS location_post_code,

      co.name AS company_name

    FROM meetings m
    LEFT JOIN users u ON m.exterminator_id = u.id 
    LEFT JOIN users cb ON m.created_by = cb.id
    LEFT JOIN customers c ON m.customer_id = c.id
    LEFT JOIN locations l ON m.location_id = l.id
    LEFT JOIN companies co ON m.company_id = co.id
    WHERE 1=1
  `;

  if (company_id) {
    query += ` AND m.company_id = ?`;
    params.push(company_id);
  }

  if (exterminator_id) {
    query += ` AND m.exterminator_id = ?`;
    params.push(exterminator_id);
  }

  query += ` ORDER BY m.scheduled_date DESC`;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const updateMeetingStatus = async (id, status) => {
  const [result] = await db.execute(
    `UPDATE meetings SET status = ? WHERE id = ?`,
    [status, id]
  );
  return result.affectedRows > 0;
};

// Delete meeting
export const deleteMeeting = async (id) => {
  const [result] = await db.execute(`DELETE FROM meetings WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};


// Get meeting by ID with role-based access
export const getMeetingById = async ({
  meeting_id,
  role,
  company_id
}) => {
  const params = [meeting_id];

  let query = `
    SELECT 
      m.id AS meeting_id,
      m.title,
      m.description,
      m.status,
      m.scheduled_date,
      m.created_at,
      m.company_id,
      m.exterminator_id,
      m.customer_id,
      m.location_id,
      m.created_by,

      c.name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.address AS customer_address,

      l.name AS location_name,
      l.address AS location_address,
      l.city AS location_city,
      l.state AS location_state,
      l.country AS location_country,

      co.name AS company_name,

      CONCAT(u.first_name, ' ', u.last_name) AS exterminator_name,
      u.email AS exterminator_email,
      u.mobile AS exterminator_mobile,
      u.profile_image AS exterminator_profile_image,
      
      CONCAT(cb.first_name, ' ', cb.last_name) AS created_by_name,
      cb.email AS created_by_email

    FROM meetings AS m
    LEFT JOIN customers AS c ON m.customer_id = c.id
    LEFT JOIN locations AS l ON m.location_id = l.id
    LEFT JOIN companies AS co ON m.company_id = co.id
    LEFT JOIN users AS u ON m.exterminator_id = u.id
    LEFT JOIN users AS cb ON m.created_by = cb.id
    WHERE m.id = ?
  `;

  // ❗ Admin ke liye koi restriction nahi
  if (role !== 'admin') {
    query += ` AND m.company_id = ?`;
    params.push(company_id);
  }

  query += ` LIMIT 1`;

  const [rows] = await db.execute(query, params);
  return rows[0] || null;
};


// models/meeting.model.js

export const fetchDetailedMeetings = async ({ company_id, exterminator_id }) => {
  let query = `
    SELECT *
    FROM meetings
    WHERE company_id = ?
    AND exterminator_id = ?
  `;

  console.log("🧠 SQL QUERY:", query);
  console.log("📥 SQL PARAMS:", [company_id, exterminator_id]);

  try {
    const [rows] = await db.execute(query, [company_id, exterminator_id]);
    console.log("🗂 SQL ROWS:", rows);
    return rows;
  } catch (error) {
    console.log("❌ SQL ERROR:", error.message);
    throw error;
  }
};


// Mark meeting as completed
export const markMeetingCompleted = async (id) => {
  const [result] = await db.execute(
    `UPDATE meetings 
     SET status = 'completed' 
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
};


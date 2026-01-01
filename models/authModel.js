import db from "../config/db.js";
import bcrypt from "bcryptjs";


// // ✅ Register normal user (OTP send karega)
// export const registerNormalUser = async (data) => {
//   const hashedPassword = await bcrypt.hash(data.password, 10);
//   const [result] = await db.execute(
//     `INSERT INTO users 
//       (first_name, last_name, email, password, auth_type, is_company_owner, is_active, created_at, updated_at)
//      VALUES (?, ?, ?, ?, 'normal', 1, 0, NOW(), NOW())`, // is_active = 0 until OTP verified
//     [data.first_name, data.last_name, data.email, hashedPassword]
//   );
//   return result.insertId;
// };
export const registerNormalUser = async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            email, 
            password, 
            company_name,
            socialData // New field for social registration
        } = req.body;

        // ✅ Check required fields based on registration type
        if (!first_name || !last_name || !email || !company_name) {
            return res.status(400).json({
                success: false,
                message: "First name, last name, email and company name are required",
            });
        }

        // ✅ For normal registration, password is required
        if (!socialData && !password) {
            return res.status(400).json({
                success: false,
                message: "Password is required for normal registration",
            });
        }

        // ✅ Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        // ✅ Check if company already exists
        const [companyCheck] = await db.execute(
            `SELECT id FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1`,
            [company_name]
        );

        if (companyCheck.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Company name already exists",
            });
        }

        // ✅ Determine registration type
        const isSocialRegistration = socialData && socialData.auth_type;
        
        // ✅ 1. Create User
        let userId;
        if (isSocialRegistration) {
            // Social media registration (no password, auto-activated)
            userId = await registerSocialUser({
                first_name,
                last_name,
                email,
                socialData
            });
        } else {
            // Normal registration with password (needs OTP)
            userId = await registerNormalUser({
                first_name,
                last_name,
                email,
                password,
            });
        }

        // ✅ 2. Create Company
        const [companyRes] = await db.execute(
            `INSERT INTO companies (name, subscription_status, created_at, updated_at)
             VALUES (?, 'inactive', NOW(), NOW())`,
            [company_name]
        );

        // ✅ 3. Update user's company_id and set as company owner
        await db.execute(
            `UPDATE users SET company_id = ?, is_company_owner = 1 WHERE id = ?`,
            [companyRes.insertId, userId]
        );

        // ✅ 4. For social registration, no OTP needed
        if (isSocialRegistration) {
            // ✅ Auto-activate social user
            await db.execute(
                `UPDATE users SET is_active = 1 WHERE id = ?`,
                [userId]
            );

            // ✅ Generate JWT token directly for social user
            const user = await getUserById(userId);
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    isAdmin: false,
                    role: "company_owner",
                    company_id: user.company_id || companyRes.insertId,
                    auth_type: socialData.auth_type
                },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(201).json({
                success: true,
                message: "User registered successfully via social media",
                data: {
                    user_id: userId,
                    email: email,
                    is_active: true,
                    token: token,
                    auth_type: socialData.auth_type,
                    need_company_creation: false
                },
            });
        } else {
            // ✅ For normal registration, generate and send OTP
            const otp = await storeOtp(email, generateOtp());
            const emailResult = await sendOtpEmail(email, otp, first_name, "verification");

            if (!emailResult.success) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to send OTP email",
                });
            }

            // ✅ Send Response (user inactive until OTP verification)
            return res.status(201).json({
                success: true,
                message: "User registered successfully. Please verify OTP.",
                data: {
                    user_id: userId,
                    email: email,
                    is_active: false,
                    need_otp_verification: true
                },
            });
        }

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// ✅ Get user by email
export const getUserByEmail = async (email) => {
  const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

// ✅ Get user by ID
export const getUserById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0];
};

// ✅ Create user via social login (Google/Facebook/Apple)
// export const registerSocialUser = async (data) => {
//   console.log('Starting social user registration with data:', data);
  
//   const {
//     first_name,
//     last_name,
//     email,
//     auth_type,
//     google_id = null,
//     google_avatar = null,
//     facebook_id = null,
//     facebook_avatar = null,
//     apple_id = null,
//     apple_avatar = null,
//   } = data;

//   try {
//     console.log('Executing SQL insert...');
//     const [result] = await db.execute(
//       `INSERT INTO users 
//         (first_name, last_name, email, auth_type, google_id, google_avatar, facebook_id, facebook_avatar, apple_id, apple_avatar, is_active, is_company_owner, created_at, updated_at)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
//       [
//         first_name,
//         last_name,
//         email,
//         auth_type,
//         google_id,
//         google_avatar,
//         facebook_id,
//         facebook_avatar,
//         apple_id,
//         apple_avatar,
//       ]
//     );
    
//     console.log('User inserted successfully with ID:', result.insertId);
//     return result.insertId;
//   } catch (error) {
//     console.error('Error in registerSocialUser:', error);
//     throw error;
//   }
// };

export const registerSocialUser = async (data) => {
  console.log('Starting social user registration with data:', data);
  
  const {
    first_name,
    last_name,
    email,
    auth_type,
    google_id = null,
    google_avatar = null,
    facebook_id = null,
    facebook_avatar = null,
    apple_id = null,
    apple_avatar = null,
  } = data;

  // ✅ Validate required fields
  if (!first_name || !email || !auth_type) {
    throw new Error('First name, email and auth_type are required');
  }

  // ✅ Validate auth_type
  const validAuthTypes = ['google', 'facebook', 'apple'];
  if (!validAuthTypes.includes(auth_type)) {
    throw new Error(`Invalid auth_type. Must be one of: ${validAuthTypes.join(', ')}`);
  }

  try {
    console.log('Executing SQL insert for social user...');
    
    // ✅ Prepare parameters based on auth_type
    let params = [
      first_name,
      last_name || '',
      email,
      auth_type,
      auth_type === 'google' ? google_id : null,
      auth_type === 'google' ? google_avatar : null,
      auth_type === 'facebook' ? facebook_id : null,
      auth_type === 'facebook' ? facebook_avatar : null,
      auth_type === 'apple' ? apple_id : null,
      auth_type === 'apple' ? apple_avatar : null,
    ];

    const [result] = await db.execute(
      `INSERT INTO users 
        (first_name, last_name, email, auth_type, 
         google_id, google_avatar, 
         facebook_id, facebook_avatar, 
         apple_id, apple_avatar, 
         is_active, is_company_owner, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
      params
    );
    
    console.log('✅ Social user inserted successfully with ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('❌ Error in registerSocialUser:', error);
    
    // ✅ Check for duplicate email
    if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate')) {
      throw new Error('User with this email already exists');
    }
    
    throw error;
  }
};

// ✅ Update Google user info
export const updateGoogleUser = async (id, google_id, google_avatar) => {
  await db.execute(
    `UPDATE users SET google_id = ?, google_avatar = ? WHERE id = ?`,
    [google_id, google_avatar, id]
  );
};

// ✅ Update Facebook user info
export const updateFacebookUser = async (id, facebook_id, facebook_avatar) => {
  await db.execute(
    `UPDATE users SET facebook_id = ?, facebook_avatar = ? WHERE id = ?`,
    [facebook_id, facebook_avatar, id]
  );
};

// ✅ Update Apple user info
export const updateAppleUser = async (id, apple_id, apple_avatar) => {
  await db.execute(
    `UPDATE users SET apple_id = ?, apple_avatar = ? WHERE id = ?`,
    [apple_id, apple_avatar, id]
  );
};


// ✅ Store OTP in database
export const storeOtp = async (email, otp) => {
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  await db.execute(
    `UPDATE users SET otp_code = ?, otp_expiry = ? WHERE email = ?`,
    [otp, otpExpiry, email]
  );
  
  return otp;
};

// ✅ Verify OTP
export const verifyOtp = async (email, otp) => {
  const [rows] = await db.execute(
    `SELECT otp_code, otp_expiry FROM users WHERE email = ?`,
    [email]
  );
  
  if (rows.length === 0) return false;
  
  const user = rows[0];
  
  // Check if OTP exists and not expired
  if (!user.otp_code || !user.otp_expiry) return false;
  
  const now = new Date();
  const expiry = new Date(user.otp_expiry);
  
  if (now > expiry) return false; // OTP expired
  
  return user.otp_code === otp;
};

// ✅ Clear OTP after successful verification
export const clearOtp = async (email) => {
  await db.execute(
    `UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE email = ?`,
    [email]
  );
};


// ✅ Activate user after OTP verification
export const activateUser = async (email) => {
  await db.execute(
    `UPDATE users SET is_active = 1, otp_code = NULL, otp_expiry = NULL WHERE email = ?`,
    [email]
  );
};

// ✅ Update user profile
export const updateUserProfile = async (userId, data) => {
  // Build dynamic SET clause and values array for the query
  const validFields = ['first_name', 'last_name', 'phone', 'avatar'];
  const updates = [];
  const values = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (validFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (updates.length === 0) return null;
  
  values.push(userId); // Add userId for WHERE clause
  
  const [result] = await db.execute(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );
  
  if (result.affectedRows > 0) {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);
    const user = rows[0];
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
  }
  return null;
};

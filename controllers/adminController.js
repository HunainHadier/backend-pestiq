import jwt from "jsonwebtoken";
import { getAllCompaniesWithOwners, getCompanyOwnerByCompanyId } from "../models/adminModel.js";

export const getAllCompanies = async (req, res) => {
  try {
    // ✅ Token check
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Token missing",
      });
    }

    // ✅ Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { role } = decoded;

    // ✅ Only admin allowed
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // ✅ Fetch companies
    const companies = await getAllCompaniesWithOwners();

    return res.json({
      success: true,
      message: "Companies fetched successfully",
      total: companies.length,
      data: companies,
    });
  } catch (err) {
    console.error("❌ getAllCompanies Error:", err);

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while fetching companies",
      error: err.message,
    });
  }
};


export const getCompanyOwnerDetail = async (req, res) => {
  try {
    const { companyId } = req.params;

    // if (req.user.role !== "admin") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Admin only access",
    //   });
    // }

    const owner = await getCompanyOwnerByCompanyId(companyId);

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    res.json({
      success: true,
      data: owner,
    });
  } catch (err) {
    console.error("❌ getCompanyOwnerDetail:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

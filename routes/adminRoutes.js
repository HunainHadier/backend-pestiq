import express from "express";
import { getAllCompanies, getCompanyOwnerDetail } from "../controllers/adminController.js";

const router = express.Router();

// ✅ Admin → Get all companies with owners
router.get("/companies", getAllCompanies);
router.get(
    "/company/:companyId/owner",
    getCompanyOwnerDetail
);
export default router;

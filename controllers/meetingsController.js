import {
  addMeeting,
  getMeetings,
  updateMeetingStatus,
  updateMeeting, // New import
  deleteMeeting,
  fetchDetailedMeetings,
  getMeetingById,
  markMeetingCompleted
} from "../models/meetingsModel.js";


// Create meeting
export const createMeeting = async (req, res) => {
  try {
    const {
      company_id,
      user_id,
      customer_id,
      location_id,
      title,
      description,
      scheduled_date
    } = req.body;

    // Creator ID is assumed to be sent from the frontend as exterminator_id (logged-in user)
    const createdBy = req.body.exterminator_id;

    if (!company_id || !createdBy || !user_id || !customer_id || !location_id || !title || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    const meetingData = {
      company_id,
      user_id,
      created_by: createdBy,
      customer_id,
      location_id,
      title,
      description,
      scheduled_date
    };

    const meetingId = await addMeeting(meetingData);

    res.status(201).json({
      success: true,
      message: "Meeting scheduled successfully",
      meeting_id: meetingId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Update meeting details
export const updateMeetingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // ✅ Changed user_id to exterminator_id
      exterminator_id,
      customer_id,
      location_id,
      title,
      description,
      scheduled_date,
      status
    } = req.body;

    // ✅ Validation updated to check for exterminator_id
    if (!exterminator_id || !customer_id || !location_id || !title || !scheduled_date) {
      return res.status(400).json({ success: false, message: "Missing required update fields (Exterminator ID is mandatory)." });
    }

    const updateData = {
      // ✅ Updated property name
      exterminator_id,
      customer_id,
      location_id,
      title,
      description,
      scheduled_date,
      status
    };

    const updated = await updateMeeting(id, updateData);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Meeting not found or no changes made." });
    }

    res.json({ success: true, message: "Meeting updated successfully" });
  } catch (err) {
    console.error("Error in updateMeetingDetails:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



export const listMeetings = async (req, res) => {
  try {
    const { exterminator_id } = req.query;

    // ✅ SAFE ACCESS
    const role = req.user?.role;
    const company_id = req.user?.company_id;

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found in request"
      });
    }

    let filters = {
      exterminator_id
    };

    // ❗ Admin ke liye koi company filter nahi
    if (role !== "admin") {
      filters.company_id = company_id;
    }

    const meetings = await getMeetings(filters);

    res.json({
      success: true,
      data: meetings
    });

  } catch (err) {
    console.error("listMeetings error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};



// Update status
export const changeMeetingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const updated = await updateMeetingStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    res.json({ success: true, message: "Meeting status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete meeting
export const removeMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteMeeting(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    res.json({ success: true, message: "Meeting deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// Get meetings by exterminator_id (Now returns full details)
export const getMeetingsForExterminator = async (req, res) => {
  try {
    const { exterminator_id } = req.params;
    if (!exterminator_id)
      return res.status(400).json({ success: false, message: "exterminator_id is required" });

    // Use getMeetings for detailed data
    const meetings = await getMeetings({ exterminator_id });
    res.json({ success: true, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Get meetings by company_id (Now returns full details)
export const getMeetingsForCompany = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id)
      return res.status(400).json({ success: false, message: "company_id is required" });

    // Use getMeetings for detailed data
    const meetings = await getMeetings({ company_id });
    res.json({ success: true, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// Get single meeting details
export const getMeetingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const company_id = req.user?.company_id;

    if (!id) {
      return res.status(400).json({ success: false, message: "Meeting ID is required" });
    }

    const meeting = await getMeetingById({
      meeting_id: id,
      role,
      company_id
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    res.json({ success: true, data: meeting });
  } catch (err) {
    console.error("Error in getMeetingDetails:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// ✅ NEW: Create meeting specifically for Exterminator (Self-Assignment Enforced)
export const createMeetingForExterminator = async (req, res) => {
  try {
    const {
      company_id,
      // user_id (Assigned User ID) ab body se nahi lenge
      customer_id,
      location_id,
      title,
      description,
      scheduled_date
    } = req.body;

    // Logged-in Exterminator ki ID: yahi created_by hogi aur yahi assigned user (user_id/exterminator_id) hogi.
    const exterminatorId = req.body.exterminator_id; // Frontend se aane wali ID

    // Validation: user_id ko ab validate karne ki zarurat nahi, kyunki wo exterminatorId hi hogi
    if (!company_id || !exterminatorId || !customer_id || !location_id || !title || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (Company, Exterminator, Customer, Location, Title, Date)."
      });
    }

    // 🛑 CORE LOGIC: Enforce Self-Assignment
    const meetingData = {
      company_id,
      user_id: exterminatorId, // Assigned User ID (exterminator_id) is set to the Creator ID
      created_by: exterminatorId, // Creator ID is the same
      customer_id,
      location_id,
      title,
      description,
      scheduled_date
    };

    const meetingId = await addMeeting(meetingData);

    res.status(201).json({
      success: true,
      message: "Meeting scheduled successfully for the exterminator",
      meeting_id: meetingId,
    });
  } catch (err) {
    console.error("Error in createMeetingForExterminator:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// controllers/new_meetings_controller.js

export const getExterminatorMeetings = async (req, res) => {
  try {
    console.log("========== CONTROLLER START ==========");
    console.log("🔥 req.user:", req.user);

    const exterminator_id = req.user?.id;
    const company_id = req.user?.company_id;

    console.log("🆔 exterminator_id:", exterminator_id);
    console.log("🏢 company_id:", company_id);

    if (!exterminator_id || !company_id) {
      console.log("❌ MISSING ID OR COMPANY");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token data"
      });
    }

    const meetings = await fetchDetailedMeetings({
      exterminator_id,
      company_id
    });

    console.log("📊 MEETINGS RESULT:", meetings);

    if (!meetings || meetings.length === 0) {
      console.log("⚠️ NO MEETINGS FOUND");
      return res.status(404).json({
        success: false,
        message: "No assigned meetings found"
      });
    }

    console.log("✅ SUCCESS RESPONSE");
    console.log("========== CONTROLLER END ==========");

    return res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });

  } catch (err) {
    console.error("💥 CONTROLLER ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





// Complete meeting
export const completeMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await markMeetingCompleted(id);

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    res.json({
      success: true,
      message: "Meeting marked as completed successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};






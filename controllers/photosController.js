import {
  uploadPhoto,
  getPhotosByMeeting,
  getPhotosByExterminator,
  getPhotosByCompany,
  getAllPhotos,
  saveAIResult,
  deletePhoto,
  saveAIFamily
} from "../models/photosModel.js";




export const addPhoto = async (req, res) => {
  try {
    const { meeting_id, customer_id, location_id, summary, processed_image } = req.body;
    const exterminator_id = req.user?.id;

    // ✅ Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    // ✅ Validation
    if (!meeting_id || !customer_id || !summary || !processed_image) {
      return res.status(400).json({
        success: false,
        message: "Missing fields (meeting_id, customer_id, summary, processed_image)",
      });
    }

    // ✅ Check summary structure
    if (!summary.species_family_map || !Array.isArray(summary.species_family_map)) {
      return res.status(400).json({
        success: false,
        message: "Invalid summary - species_family_map missing or invalid",
      });
    }

    if (!summary.families || !Array.isArray(summary.families)) {
      return res.status(400).json({
        success: false,
        message: "Invalid summary - families missing or invalid",
      });
    }

    const speciesFamilyMap = summary.species_family_map;
    const families = summary.families;

    // ================================================================
    // STEP 1: Save Photo (base64)
    // ================================================================
    const photoId = await uploadPhoto({
      meeting_id,
      exterminator_id,
      customer_id,
      image_base64: processed_image,
      location_id,
    });

    // ================================================================
    // STEP 2: Save AI Species Results WITH FAMILY MAPPING
    // ================================================================
    for (const item of speciesFamilyMap) {
      await saveAIResult({
        photo_id: photoId,
        detected_pest: item.species,
        pest_count: item.count,
        family_name: item.family  // ✅ Family bhi save karo
      });
    }

    // ================================================================
    // STEP 3: Save AI Families Summary
    // ================================================================
    for (const fam of families) {
      await saveAIFamily({
        photo_id: photoId,
        family_name: fam.family,
        family_count: fam.count,
      });
    }

    res.status(201).json({
      success: true,
      message: "Photo and AI results saved successfully",
      photo_id: photoId,
      total_insects: summary.total_insects || 0,
    });

  } catch (err) {
    console.error("Error in addPhoto:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


export const getPhotosByMeetingId = async (req, res) => {
  try {
    const { meeting_id } = req.params;
    
    if (!meeting_id || isNaN(meeting_id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid meeting ID" 
      });
    }

    const photos = await getPhotosByMeeting(meeting_id);
    
    res.json({ 
      success: true, 
      data: photos,
      count: photos.length
    });
  } catch (err) {
    console.error("Error fetching photos by meeting:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Get photos by exterminator (from token)
export const getPhotosByExterminatorId = async (req, res) => {
  try {
    const exterminator_id = req.user?.id;
    
    if (!exterminator_id) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Exterminator ID not found in token" 
      });
    }

    const photos = await getPhotosByExterminator(exterminator_id);
    
    res.json({ 
      success: true, 
      data: photos,
      count: photos.length
    });
  } catch (err) {
    console.error("Error fetching photos by exterminator:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ✅ Get photos by company (role-based access)
export const getPhotosByCompanyId = async (req, res) => {
  try {
    const { company_id, role } = req.user; // token se data

    let photos;

    // 🟢 Admin → fetch ALL photos
    if (role === "admin") {
      photos = await getAllPhotos();
    } 
    // 🔵 Normal user → only their company photos
    else {
      if (!company_id) {
        return res.status(400).json({ 
          success: false, 
          message: "Company ID missing for user" 
        });
      }
      photos = await getPhotosByCompany(company_id);
    }

    res.json({ 
      success: true, 
      data: photos,
      count: photos.length
    });

  } catch (err) {
    console.error("Error fetching company photos:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};


// Delete photo
export const removePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deletePhoto(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    res.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
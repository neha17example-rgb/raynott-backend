const { db } = require('../firebaseAdmin');
const EnquiryModel = require('../Models/EnquiryModel');

// Submit a new enquiry
const submitEnquiry = async (req, res) => {
  try {
    console.log(' New enquiry request:', req.body);

    // Get parent info from request (if authenticated)
    const parentData = req.parentData || {};

    // Create enquiry instance with parent data if available
    const enquiryData = {
      ...req.body,
      parentName: req.body.parentName || parentData.parentName || 'Parent',
      parentEmail: req.body.parentEmail || parentData.email || '',
      parentPhone: req.body.parentPhone || parentData.phone || '',
      studentName: req.body.studentName || parentData.studentName || '',
      studentClass: req.body.studentClass || parentData.studentClass || '',
    };

    const enquiry = new EnquiryModel(enquiryData);

    // Validate enquiry data
    const validationErrors = enquiry.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Store enquiry in Firebase
    const enquiryRef = db.ref('enquiries').push();
    const enquiryId = enquiryRef.key;

    const enquiryPayload = {
      id: enquiryId,
      ...enquiry.toJSON(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.set(enquiryPayload);

    // Also store under institution's enquiries for quick lookup
    const institutionEnquiryRef = db.ref(`institutionEnquiries/${enquiryPayload.institutionId}/${enquiryId}`);
    await institutionEnquiryRef.set({
      enquiryId: enquiryId,
      parentName: enquiryPayload.parentName,
      subject: enquiryPayload.subject,
      status: enquiryPayload.status,
      createdAt: enquiryPayload.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      data: enquiryPayload
    });

  } catch (error) {
    console.error('❌ Error submitting enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry',
      error: error.message
    });
  }
};

// Get all enquiries (admin only)
const getAllEnquiries = async (req, res) => {
  try {
    const { 
      status, 
      institutionId, 
      institutionType,
      parentEmail,
      startDate,
      endDate,
      limit = 50,
      offset = 0 
    } = req.query;

    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    // Convert to array
    let enquiriesArray = Object.values(enquiries);

    // Apply filters
    if (status) {
      enquiriesArray = enquiriesArray.filter(e => e.status === status);
    }

    if (institutionId) {
      enquiriesArray = enquiriesArray.filter(e => e.institutionId === institutionId);
    }

    if (institutionType) {
      enquiriesArray = enquiriesArray.filter(e => e.institutionType === institutionType);
    }

    if (parentEmail) {
      enquiriesArray = enquiriesArray.filter(e => 
        e.parentEmail && e.parentEmail.toLowerCase().includes(parentEmail.toLowerCase())
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      enquiriesArray = enquiriesArray.filter(e => new Date(e.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      enquiriesArray = enquiriesArray.filter(e => new Date(e.createdAt) <= end);
    }

    // Sort by createdAt (newest first)
    enquiriesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const total = enquiriesArray.length;
    const paginated = enquiriesArray.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiries',
      error: error.message
    });
  }
};

// Get enquiries for a specific parent
const getParentEnquiries = async (req, res) => {
  try {
    const parentEmail = req.parentData?.email || req.query.email;
    
    if (!parentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Parent email is required'
      });
    }

    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    // Convert to array and filter by parent email
    let enquiriesArray = Object.values(enquiries)
      .filter(e => e.parentEmail && e.parentEmail.toLowerCase() === parentEmail.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: enquiriesArray,
      count: enquiriesArray.length
    });

  } catch (error) {
    console.error('❌ Error fetching parent enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your enquiries',
      error: error.message
    });
  }
};

// Get enquiries for a specific institution
const getInstitutionEnquiries = async (req, res) => {
  try {
    const { institutionId } = req.params;

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        message: 'Institution ID is required'
      });
    }

    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    // Convert to array and filter by institution ID
    let enquiriesArray = Object.values(enquiries)
      .filter(e => e.institutionId === institutionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: enquiriesArray,
      count: enquiriesArray.length
    });

  } catch (error) {
    console.error('❌ Error fetching institution enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institution enquiries',
      error: error.message
    });
  }
};

// Get a single enquiry by ID
const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID is required'
      });
    }

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Check if parent has access to this enquiry
    if (req.parentData && enquiry.parentEmail !== req.parentData.email) {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this enquiry'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { id, ...enquiry }
    });

  } catch (error) {
    console.error('❌ Error fetching enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiry',
      error: error.message
    });
  }
};

// Update enquiry status
const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'responded', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, responded, or closed'
      });
    }

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Update the enquiry
    const updates = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.update(updates);

    // Also update the institution enquiry reference
    if (enquiry.institutionId) {
      const institutionEnquiryRef = db.ref(`institutionEnquiries/${enquiry.institutionId}/${id}`);
      await institutionEnquiryRef.update({
        status: status,
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `Enquiry status updated to ${status}`,
      data: { id, ...enquiry, ...updates }
    });

  } catch (error) {
    console.error('❌ Error updating enquiry status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enquiry status',
      error: error.message
    });
  }
};

// Add a response to an enquiry
const addEnquiryResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, responseBy, responseByRole } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID is required'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Create response object
    const response = {
      id: `resp_${Date.now()}`,
      message: message,
      responseBy: responseBy || 'Admin',
      responseByRole: responseByRole || 'admin',
      createdAt: new Date().toISOString()
    };

    // Get existing responses or initialize array
    const responses = enquiry.responses || [];
    responses.push(response);

    // Update the enquiry with new response and status
    const updates = {
      responses: responses,
      status: 'responded',
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.update(updates);

    // Also update the institution enquiry reference
    if (enquiry.institutionId) {
      const institutionEnquiryRef = db.ref(`institutionEnquiries/${enquiry.institutionId}/${id}`);
      await institutionEnquiryRef.update({
        status: 'responded',
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { id, ...enquiry, ...updates }
    });

  } catch (error) {
    console.error('❌ Error adding response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response',
      error: error.message
    });
  }
};

// Get enquiries statistics
const getEnquiryStats = async (req, res) => {
  try {
    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    const enquiries = snapshot.val() || {};

    const enquiriesArray = Object.values(enquiries);

    const stats = {
      total: enquiriesArray.length,
      pending: enquiriesArray.filter(e => e.status === 'pending').length,
      responded: enquiriesArray.filter(e => e.status === 'responded').length,
      closed: enquiriesArray.filter(e => e.status === 'closed').length,
      byInstitutionType: {}
    };

    // Group by institution type
    enquiriesArray.forEach(e => {
      const type = e.institutionType || 'Unknown';
      if (!stats.byInstitutionType[type]) {
        stats.byInstitutionType[type] = 0;
      }
      stats.byInstitutionType[type]++;
    });

    // Get recent enquiries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    stats.recent = enquiriesArray
      .filter(e => new Date(e.createdAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching enquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiry statistics',
      error: error.message
    });
  }
};

// Delete an enquiry (admin only)
const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Enquiry ID is required'
      });
    }

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Remove from main enquiries
    await enquiryRef.remove();

    // Remove from institution enquiries
    if (enquiry.institutionId) {
      const institutionEnquiryRef = db.ref(`institutionEnquiries/${enquiry.institutionId}/${id}`);
      await institutionEnquiryRef.remove();
    }

    res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enquiry',
      error: error.message
    });
  }
};

module.exports = {
  submitEnquiry,
  getAllEnquiries,
  getParentEnquiries,
  getInstitutionEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  addEnquiryResponse,
  getEnquiryStats,
  deleteEnquiry
};
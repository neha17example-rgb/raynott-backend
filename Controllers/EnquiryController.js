const { db } = require('../firebaseAdmin');
const EnquiryModel = require('../Models/EnquiryModel');
const InstitutionLimitModel = require('../Models/InstitutionLimitModel');

const DEFAULT_FREE_LIMIT = 5;

// ============ HELPER: Get Institution Limit ============
const getInstitutionLimitData = async (institutionId) => {
  try {
    const limitRef = db.ref(`institutionLimits/${institutionId}`);
    const snapshot = await limitRef.once('value');
    const data = snapshot.val();

    if (!data) {
      // Return default if no limit set
      return {
        institutionId,
        freeLimit: DEFAULT_FREE_LIMIT,
        customLimit: 0,
        totalLimit: DEFAULT_FREE_LIMIT,
        lastUpdatedAt: null
      };
    }

    return {
      institutionId,
      freeLimit: data.freeLimit || DEFAULT_FREE_LIMIT,
      customLimit: data.customLimit || 0,
      totalLimit: (data.freeLimit || DEFAULT_FREE_LIMIT) + (data.customLimit || 0),
      lastUpdatedAt: data.lastUpdatedAt || null,
      ...data
    };
  } catch (error) {
    console.error('Error fetching institution limit:', error);
    return {
      institutionId,
      freeLimit: DEFAULT_FREE_LIMIT,
      customLimit: 0,
      totalLimit: DEFAULT_FREE_LIMIT,
      lastUpdatedAt: null
    };
  }
};

// ============ SUBMIT ENQUIRY ============
const submitEnquiry = async (req, res) => {
  try {
    console.log('📝 New enquiry request:', req.body);

    const parentData = req.parentData || {};

    const enquiryData = {
      ...req.body,
      parentName: req.body.parentName || parentData.parentName || 'Parent',
      parentEmail: req.body.parentEmail || parentData.email || '',
      parentPhone: req.body.parentPhone || parentData.phone || '',
      studentName: req.body.studentName || parentData.studentName || '',
      studentClass: req.body.studentClass || parentData.studentClass || '',
    };

    const enquiry = new EnquiryModel(enquiryData);

    const validationErrors = enquiry.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const enquiryRef = db.ref('enquiries').push();
    const enquiryId = enquiryRef.key;

    const enquiryPayload = {
      id: enquiryId,
      ...enquiry.toJSON(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.set(enquiryPayload);

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

// ============ GET ALL ENQUIRIES ============
const getAllEnquiries = async (req, res) => {
  try {
    const { 
      status, 
      institutionId, 
      institutionType,
      parentEmail,
      startDate,
      endDate,
      limit = 500,
      offset = 0 
    } = req.query;

    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    let enquiriesArray = Object.values(enquiries);

    if (status) enquiriesArray = enquiriesArray.filter(e => e.status === status);
    if (institutionId) enquiriesArray = enquiriesArray.filter(e => e.institutionId === institutionId);
    if (institutionType) enquiriesArray = enquiriesArray.filter(e => e.institutionType === institutionType);
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

    enquiriesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

// ============ GET PARENT ENQUIRIES ============
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

// ============ GET INSTITUTION ENQUIRIES (PUBLIC - WITH LIMIT) ============
const getInstitutionEnquiries = async (req, res) => {
  try {
    const { institutionId } = req.params;

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        message: 'Institution ID is required'
      });
    }

    // Fetch all enquiries for this institution
    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    let enquiriesArray = Object.values(enquiries)
      .filter(e => e.institutionId === institutionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Get the institution's limit
    const limitInfo = await getInstitutionLimitData(institutionId);
    const totalLimit = limitInfo.totalLimit;

    // Split into visible and locked
    const visibleEnquiries = enquiriesArray.slice(0, totalLimit);
    const lockedEnquiries = enquiriesArray.slice(totalLimit);

    // Return with limit info
    res.status(200).json({
      success: true,
      data: enquiriesArray,                    // All enquiries (for admin)
      visibleEnquiries: visibleEnquiries,      // Only visible (for institution)
      lockedCount: lockedEnquiries.length,     // Count of locked
      limit: {
        freeLimit: limitInfo.freeLimit,
        customLimit: limitInfo.customLimit,
        totalLimit: limitInfo.totalLimit
      },
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

// ============ GET SINGLE ENQUIRY BY ID ============
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

    if (req.parentData && enquiry.parentEmail !== req.parentData.email) {
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

// ============ UPDATE ENQUIRY STATUS ============
const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return res.status(400).json({ success: false, message: 'Enquiry ID is required' });
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

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

    const updates = {
      status: status,
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.update(updates);

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

// ============ ADD ENQUIRY RESPONSE ============
const addEnquiryResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, responseBy, responseByRole } = req.body;

    if (!id) return res.status(400).json({ success: false, message: 'Enquiry ID is required' });
    if (!message) return res.status(400).json({ success: false, message: 'Response message is required' });

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    const response = {
      id: `resp_${Date.now()}`,
      message: message,
      responseBy: responseBy || 'Admin',
      responseByRole: responseByRole || 'admin',
      createdAt: new Date().toISOString()
    };

    const responses = enquiry.responses || [];
    responses.push(response);

    const updates = {
      responses: responses,
      status: 'responded',
      updatedAt: new Date().toISOString()
    };

    await enquiryRef.update(updates);

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

// ============ GET ENQUIRY STATS ============
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

    enquiriesArray.forEach(e => {
      const type = e.institutionType || 'Unknown';
      if (!stats.byInstitutionType[type]) stats.byInstitutionType[type] = 0;
      stats.byInstitutionType[type]++;
    });

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

// ============ DELETE ENQUIRY ============
const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ success: false, message: 'Enquiry ID is required' });

    const enquiryRef = db.ref(`enquiries/${id}`);
    const snapshot = await enquiryRef.once('value');
    const enquiry = snapshot.val();

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    await enquiryRef.remove();

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

// ================================================================
// ============ INSTITUTION LIMIT MANAGEMENT (NEW) ================
// ================================================================

// ============ SET / UPDATE INSTITUTION LIMIT (Admin Only) ============
const setInstitutionLimit = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { customLimit, institutionName, institutionType, institutionEmail, note } = req.body;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required' });
    }

    if (customLimit === undefined || customLimit === null) {
      return res.status(400).json({ success: false, message: 'customLimit is required' });
    }

    if (customLimit < 0) {
      return res.status(400).json({ success: false, message: 'customLimit cannot be negative' });
    }

    const limitRef = db.ref(`institutionLimits/${institutionId}`);
    const existingSnapshot = await limitRef.once('value');
    const existingData = existingSnapshot.val();

    const currentFreeLimit = existingData?.freeLimit || DEFAULT_FREE_LIMIT;
    const totalLimit = currentFreeLimit + Number(customLimit);

    let limitData;

    if (existingData) {
      // Update existing
      const model = new InstitutionLimitModel(existingData);
      model.updateLimit(Number(customLimit), req.user?.email || 'admin', note || '');
      
      limitData = {
        ...model.toJSON(),
        institutionName: institutionName || existingData.institutionName || '',
        institutionType: institutionType || existingData.institutionType || '',
        institutionEmail: institutionEmail || existingData.institutionEmail || ''
      };
    } else {
      // Create new
      const model = new InstitutionLimitModel({
        institutionId,
        institutionName: institutionName || '',
        institutionType: institutionType || '',
        institutionEmail: institutionEmail || '',
        freeLimit: DEFAULT_FREE_LIMIT,
        customLimit: Number(customLimit),
        totalLimit,
        lastUpdatedBy: req.user?.email || 'admin'
      });
      
      limitData = model.toJSON();
      
      // Add initial history
      limitData.limitHistory = [{
        id: `hist_${Date.now()}`,
        action: 'initial_setup',
        previousLimit: 0,
        newLimit: Number(customLimit),
        updatedBy: req.user?.email || 'admin',
        note: note || 'Initial limit setup',
        timestamp: new Date().toISOString()
      }];
    }

    await limitRef.set(limitData);

    console.log(`✅ Institution limit set: ${institutionId} → ${totalLimit} total`);

    res.status(200).json({
      success: true,
      message: `Limit updated successfully. Institution can now see ${totalLimit} enquiries.`,
      data: limitData
    });

  } catch (error) {
    console.error('❌ Error setting institution limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set institution limit',
      error: error.message
    });
  }
};

// ============ GET INSTITUTION LIMIT (Public/Admin) ============
const getInstitutionLimit = async (req, res) => {
  try {
    const { institutionId } = req.params;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required' });
    }

    const limitInfo = await getInstitutionLimitData(institutionId);

    res.status(200).json({
      success: true,
      data: limitInfo
    });

  } catch (error) {
    console.error('❌ Error fetching institution limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institution limit',
      error: error.message
    });
  }
};

// ============ GET ALL INSTITUTION LIMITS (Admin) ============
const getAllInstitutionLimits = async (req, res) => {
  try {
    const limitsRef = db.ref('institutionLimits');
    const snapshot = await limitsRef.once('value');
    const limits = snapshot.val() || {};

    const limitsArray = Object.values(limits).sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );

    res.status(200).json({
      success: true,
      data: limitsArray,
      count: limitsArray.length
    });

  } catch (error) {
    console.error('❌ Error fetching all limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institution limits',
      error: error.message
    });
  }
};

// ============ RESET INSTITUTION LIMIT (Admin) ============
const resetInstitutionLimit = async (req, res) => {
  try {
    const { institutionId } = req.params;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required' });
    }

    const limitRef = db.ref(`institutionLimits/${institutionId}`);
    const snapshot = await limitRef.once('value');
    const existingData = snapshot.val();

    if (!existingData) {
      return res.status(404).json({
        success: false,
        message: 'Institution limit not found'
      });
    }

    const model = new InstitutionLimitModel(existingData);
    model.updateLimit(0, req.user?.email || 'admin', 'Reset to default');

    await limitRef.set(model.toJSON());

    res.status(200).json({
      success: true,
      message: 'Limit reset to default',
      data: model.toJSON()
    });

  } catch (error) {
    console.error('❌ Error resetting limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset institution limit',
      error: error.message
    });
  }
};

// ============ GET LOCKED ENQUIRIES FOR INSTITUTION ============
const getLockedEnquiries = async (req, res) => {
  try {
    const { institutionId } = req.params;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required' });
    }

    const enquiriesRef = db.ref('enquiries');
    const snapshot = await enquiriesRef.once('value');
    let enquiries = snapshot.val() || {};

    let enquiriesArray = Object.values(enquiries)
      .filter(e => e.institutionId === institutionId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const limitInfo = await getInstitutionLimitData(institutionId);
    const lockedEnquiries = enquiriesArray.slice(limitInfo.totalLimit);

    // Return only count and dates (no PII for locked ones)
    const lockedSummary = lockedEnquiries.map(e => ({
      id: e.id,
      createdAt: e.createdAt,
      status: e.status,
      subject: e.subject  // just the subject for preview
    }));

    res.status(200).json({
      success: true,
      data: {
        lockedCount: lockedEnquiries.length,
        lockedEnquiries: lockedSummary,
        limit: limitInfo
      }
    });

  } catch (error) {
    console.error('❌ Error fetching locked enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locked enquiries',
      error: error.message
    });
  }
};

module.exports = {
  // Enquiry functions
  submitEnquiry,
  getAllEnquiries,
  getParentEnquiries,
  getInstitutionEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  addEnquiryResponse,
  getEnquiryStats,
  deleteEnquiry,
  
  // Institution limit functions 
  setInstitutionLimit,
  getInstitutionLimit,
  getAllInstitutionLimits,
  resetInstitutionLimit,
  getLockedEnquiries,
};
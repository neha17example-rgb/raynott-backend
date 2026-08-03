// Controllers/AdminRegController.js
const { db } = require('../firebaseAdmin');
const SchoolModel = require('../Models/SchoolModel');
const CollegeModel = require('../Models/CollegeModel');
const PUCollegeModel = require('../Models/PuCollegeModel');
const TuitionCoachingModel = require('../Models/TuitionCoachingModel');
const TeacherModel = require('../Models/TeachersModel');

const getPendingRegistrations = async (req, res) => {
  try {
    const requestsRef = db.ref('registration_requests');
    const snapshot = await requestsRef.once('value');
    const allRequests = snapshot.val() || {};

    const pendingRequests = Object.values(allRequests).filter(request => request.status === 'pending');

    res.status(200).json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length
    });
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending registrations',
      error: error.message
    });
  }
};

const getAllRegistrations = async (req, res) => {
  try {
    const requestsRef = db.ref('registration_requests');
    const snapshot = await requestsRef.once('value');
    const requests = snapshot.val() || {};

    res.status(200).json({
      success: true,
      data: Object.values(requests),
      count: Object.keys(requests).length
    });
  } catch (error) {
    console.error('Error fetching all registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations',
      error: error.message
    });
  }
};

// FIXED: approveRegistration with proper school creation and response
const approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    console.log('📝 Approving registration:', id);
    
    const requestRef = db.ref(`registration_requests/${id}`);
    const snapshot = await requestRef.once('value');
    const request = snapshot.val();
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }
    
    // Check if school already exists for this registration
    let schoolId = request.schoolId;
    
    if (!schoolId) {
      console.log('🏫 Creating school from registration data...');
      
      // Create the school from the registration data
      const schoolRef = db.ref('schools').push();
      schoolId = schoolRef.key;
      
      // Create school document with proper data
      const schoolData = {
        id: schoolId,
        name: request.name || request.institutionName || '',
        tagline: request.tagline || '',
        typeOfSchool: request.typeOfSchool || '',
        affiliation: request.affiliation || '',
        grade: request.grade || '',
        ageForAdmission: request.ageForAdmission || '',
        language: request.language || '',
        establishmentYear: request.establishmentYear || '',
        about: request.about || '',
        facilities: request.facilities || [],
        totalAnnualFee: request.totalAnnualFee || '',
        admissionFee: request.admissionFee || '',
        tuitionFee: request.tuitionFee || '',
        transportFee: request.transportFee || '',
        booksUniformsFee: request.booksUniformsFee || '',
        address: request.address || '',
        city: request.city || '',
        state: request.state || '',
        pincode: request.pincode || '',
        phone: request.phone || '',
        email: request.email || '',
        website: request.website || '',
        socialMedia: request.socialMedia || {},
        googleMapsEmbedUrl: request.googleMapsEmbedUrl || '',
        campusSize: request.campusSize || '',
        classrooms: request.classrooms || '',
        laboratories: request.laboratories || '',
        library: request.library || '',
        playground: request.playground || '',
        auditorium: request.auditorium || '',
        smartBoards: request.smartBoards || '',
        cctv: request.cctv || '',
        medicalRoom: request.medicalRoom || '',
        wifi: request.wifi || '',
        hostel: request.hostel || '',
        sports: request.sports || '',
        admissionLink: request.admissionLink || '',
        admissionProcess: request.admissionProcess || '',
        schoolImage: request.schoolImage || '',
        photos: request.photos || [],
        studentStrength: request.studentStrength || '',
        teacherStrength: request.teacherStrength || '',
        studentTeacherRatio: request.studentTeacherRatio || '',
        principalName: request.principalName || '',
        contactPerson: request.contactPerson || '',
        alternatePhone: request.alternatePhone || '',
        officeHours: request.officeHours || '',
        status: 'active',
        registrationId: id,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      await schoolRef.set(schoolData);
      console.log('✅ School created with ID:', schoolId);
      
    } else {
      console.log('✅ School already exists with ID:', schoolId);
    }
    
    // Update registration request with schoolId and status
    await requestRef.update({
      status: 'approved',
      approvedAt: new Date().toISOString(),
      schoolId: schoolId,
      adminNotes: adminNotes || null
    });
    
    // Return the schoolId in the response
    res.json({
      success: true,
      message: 'Registration approved successfully',
      data: { 
        schoolId: schoolId, 
        registrationId: id 
      }
    });
    
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve registration',
      error: error.message
    });
  }
};

// FIXED: moveToPublicCollection now returns the ID
const moveToPublicCollection = async (request) => {
  try {
    const publicData = { ...request };
    
    // Remove admin fields
    delete publicData.status;
    delete publicData.submittedAt;
    delete publicData.approvedAt;
    delete publicData.rejectedAt;
    delete publicData.adminNotes;
    delete publicData.rejectionReason;
    
    // Add public fields
    publicData.isActive = true;
    publicData.listedAt = new Date().toISOString();
    publicData.updatedAt = new Date().toISOString();
    
    // Collection mapping
    let collectionName;
    switch (request.institutionType) {
      case 'school':
        collectionName = 'schools';
        break;
      case 'college':
        collectionName = 'colleges';
        break;
      case 'pu_college':
        collectionName = 'pucolleges';
        break;
      case 'coaching':
        collectionName = 'tuitioncoaching';
        break;
      case 'teacher':
        collectionName = 'teachers';
        break;
      default:
        collectionName = 'others';
    }
    
    const publicRef = db.ref(collectionName).push();
    const publicId = publicRef.key;
    
    publicData.id = publicId;
    
    await publicRef.set(publicData);
    
    console.log(`✅ Moved to ${collectionName} with ID: ${publicId}`);
    return publicId;
    
  } catch (error) {
    console.error('Error moving to public collection:', error);
    throw error;
  }
};

const rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    
    const requestRef = db.ref(`registration_requests/${id}`);
    const snapshot = await requestRef.once('value');
    const request = snapshot.val();
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }
    
    const updateData = {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectionReason || 'No reason provided',
      adminNotes: adminNotes || null,
      updatedAt: new Date().toISOString()
    };
    
    await requestRef.update(updateData);
    
    res.status(200).json({
      success: true,
      message: 'Registration rejected successfully',
      data: { ...request, ...updateData }
    });
    
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject registration',
      error: error.message
    });
  }
};

const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestRef = db.ref(`registration_requests/${id}`);
    const snapshot = await requestRef.once('value');
    const request = snapshot.val();
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: request
    });
    
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration',
      error: error.message
    });
  }
};

// FIX: Endpoint to fix existing registrations without schoolId
const fixRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔧 Fixing registration:', id);
    
    const requestRef = db.ref(`registration_requests/${id}`);
    const snapshot = await requestRef.once('value');
    const request = snapshot.val();
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    // Check if school already exists
    let schoolId = request.schoolId;
    
    if (!schoolId) {
      console.log('🏫 Creating missing school for registration...');
      
      // Create school from registration
      const schoolRef = db.ref('schools').push();
      schoolId = schoolRef.key;
      
      const schoolData = {
        id: schoolId,
        name: request.name || request.institutionName || 'School',
        email: request.email || '',
        phone: request.phone || '',
        address: request.address || '',
        city: request.city || '',
        state: request.state || '',
        pincode: request.pincode || '',
        typeOfSchool: request.typeOfSchool || '',
        affiliation: request.affiliation || '',
        grade: request.grade || '',
        establishmentYear: request.establishmentYear || '',
        tagline: request.tagline || '',
        about: request.about || '',
        facilities: request.facilities || [],
        totalAnnualFee: request.totalAnnualFee || '',
        admissionFee: request.admissionFee || '',
        tuitionFee: request.tuitionFee || '',
        transportFee: request.transportFee || '',
        booksUniformsFee: request.booksUniformsFee || '',
        website: request.website || '',
        socialMedia: request.socialMedia || {},
        googleMapsEmbedUrl: request.googleMapsEmbedUrl || '',
        campusSize: request.campusSize || '',
        classrooms: request.classrooms || '',
        laboratories: request.laboratories || '',
        library: request.library || '',
        playground: request.playground || '',
        auditorium: request.auditorium || '',
        smartBoards: request.smartBoards || '',
        cctv: request.cctv || '',
        medicalRoom: request.medicalRoom || '',
        wifi: request.wifi || '',
        hostel: request.hostel || '',
        sports: request.sports || '',
        admissionLink: request.admissionLink || '',
        admissionProcess: request.admissionProcess || '',
        schoolImage: request.schoolImage || '',
        photos: request.photos || [],
        studentStrength: request.studentStrength || '',
        teacherStrength: request.teacherStrength || '',
        studentTeacherRatio: request.studentTeacherRatio || '',
        principalName: request.principalName || '',
        contactPerson: request.contactPerson || '',
        alternatePhone: request.alternatePhone || '',
        officeHours: request.officeHours || '',
        status: 'active',
        registrationId: id,
        createdAt: new Date().toISOString(),
        approvedAt: request.approvedAt || new Date().toISOString()
      };
      
      await schoolRef.set(schoolData);
      console.log('✅ School created with ID:', schoolId);
      
      // Update registration
      await requestRef.update({
        schoolId: schoolId
      });
      
      res.json({
        success: true,
        message: 'Registration fixed successfully',
        data: { schoolId, registrationId: id }
      });
    } else {
      res.json({
        success: true,
        message: 'School already exists',
        data: { schoolId, registrationId: id }
      });
    }
  } catch (error) {
    console.error('Error fixing registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix registration',
      error: error.message
    });
  }
};

module.exports = {
  getPendingRegistrations,
  getAllRegistrations,
  approveRegistration,
  rejectRegistration,
  getRegistrationById,
  moveToPublicCollection,
  fixRegistration
};
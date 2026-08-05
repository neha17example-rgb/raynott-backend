// Controllers/AdminRegController.js
const { db } = require('../firebaseAdmin');

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

// Get the correct collection name based on institution type
const getCollectionName = (institutionType) => {
  const collectionMap = {
    'school': 'schools',
    'college': 'colleges',
    'pu_college': 'pucolleges',
    'coaching': 'tuitioncoaching',
    'teacher': 'teachers'
  };
  return collectionMap[institutionType] || 'schools';
};

// Get the correct type label
const getInstitutionTypeLabel = (institutionType) => {
  const labelMap = {
    'school': 'School',
    'college': 'College',
    'pu_college': 'PU College',
    'coaching': 'Coaching Center',
    'teacher': 'Teacher'
  };
  return labelMap[institutionType] || 'School';
};

// FIXED: approveRegistration with proper routing to correct collections
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
    
    const institutionType = request.institutionType || request.type || 'school';
    const collectionName = getCollectionName(institutionType);
    const typeLabel = getInstitutionTypeLabel(institutionType);
    
    console.log(`🏫 Creating ${typeLabel} in collection: ${collectionName}`);
    
    // Check if institution already exists
    let institutionId = request.institutionId || request.schoolId;
    
    if (!institutionId) {
      // Create the institution in the appropriate collection
      const institutionRef = db.ref(collectionName).push();
      institutionId = institutionRef.key;
      
      // Prepare base institution data
      const institutionData = {
        id: institutionId,
        institutionType: institutionType,
        name: request.name || request.institutionName || '',
        tagline: request.tagline || '',
        establishmentYear: request.establishmentYear || '',
        about: request.about || '',
        address: request.address || '',
        city: request.city || '',
        state: request.state || '',
        pincode: request.pincode || '',
        email: request.email || '',
        phone: request.phone || '',
        website: request.website || '',
        googleMapsEmbedUrl: request.googleMapsEmbedUrl || '',
        facilities: request.facilities || [],
        socialMedia: request.socialMedia || {},
        // Fee Structure
        totalAnnualFee: request.totalAnnualFee || '',
        admissionFee: request.admissionFee || '',
        tuitionFee: request.tuitionFee || '',
        transportFee: request.transportFee || '',
        booksUniformsFee: request.booksUniformsFee || '',
        // Contact Info
        principalName: request.principalName || '',
        contactPerson: request.contactPerson || '',
        alternatePhone: request.alternatePhone || '',
        officeHours: request.officeHours || '',
        // Infrastructure
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
        // Admission
        admissionLink: request.admissionLink || '',
        admissionProcess: request.admissionProcess || '',
        // Images
        schoolImage: request.schoolImage || '',
        photos: request.photos || [],
        // Documents
        registrationCertificate: request.registrationCertificate || '',
        affiliationNumber: request.affiliationNumber || '',
        qualificationCertificates: request.qualificationCertificates || [],
        idProof: request.idProof || '',
        profileImage: request.profileImage || '',
        otherDocuments: request.otherDocuments || [],
        // Status
        status: 'active',
        registrationId: id,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Add institution-specific fields based on type
      if (institutionType === 'school') {
        institutionData.typeOfSchool = request.typeOfSchool || '';
        institutionData.affiliation = request.affiliation || '';
        institutionData.grade = request.grade || '';
        institutionData.ageForAdmission = request.ageForAdmission || '';
        institutionData.language = request.language || '';
        institutionData.studentStrength = request.studentStrength || '';
        institutionData.teacherStrength = request.teacherStrength || '';
        institutionData.studentTeacherRatio = request.studentTeacherRatio || '';
      } else if (institutionType === 'college') {
        institutionData.typeOfCollege = request.typeOfCollege || '';
        institutionData.universityAffiliation = request.universityAffiliation || '';
        institutionData.coursesOffered = request.coursesOffered || '';
        institutionData.duration = request.duration || '';
        institutionData.accreditation = request.accreditation || '';
        institutionData.placementStatistics = request.placementStatistics || '';
        institutionData.departments = request.departments || '';
      } else if (institutionType === 'pu_college') {
        institutionData.board = request.board || '';
        institutionData.streams = request.streams || '';
        institutionData.subjects = request.subjects || '';
        institutionData.programDuration = request.programDuration || '';
        institutionData.competitiveExamPrep = request.competitiveExamPrep || '';
      } else if (institutionType === 'coaching') {
        institutionData.typeOfCoaching = request.typeOfCoaching || '';
        institutionData.classes = request.classes || '';
        institutionData.batchSize = request.batchSize || '';
        institutionData.classDuration = request.classDuration || '';
        institutionData.faculty = request.faculty || '';
        institutionData.studyMaterial = request.studyMaterial || '';
        institutionData.tests = request.tests || '';
        institutionData.doubtSessions = request.doubtSessions || '';
        institutionData.infrastructure = request.infrastructure || '';
        institutionData.demoClass = request.demoClass || '';
        institutionData.flexibleTimings = request.flexibleTimings || '';
      } else if (institutionType === 'teacher') {
        institutionData.teacherName = request.teacherName || '';
        institutionData.qualifications = request.qualifications || '';
        institutionData.experience = request.experience || '';
        institutionData.teachingMode = request.teachingMode || '';
        institutionData.languages = request.languages || '';
        institutionData.specialization = request.specialization || '';
        institutionData.certifications = request.certifications || '';
        institutionData.availability = request.availability || '';
        institutionData.hourlyRate = request.hourlyRate || '';
        institutionData.monthlyPackage = request.monthlyPackage || '';
        institutionData.examPreparation = request.examPreparation || '';
        institutionData.demoFee = request.demoFee || '';
        institutionData.teachingApproach = request.teachingApproach || '';
        institutionData.studyMaterials = request.studyMaterials || '';
        institutionData.sessionDuration = request.sessionDuration || '';
        institutionData.studentLevel = request.studentLevel || '';
        institutionData.classSize = request.classSize || '';
        institutionData.onlinePlatform = request.onlinePlatform || '';
        institutionData.progressReports = request.progressReports || '';
        institutionData.performanceTracking = request.performanceTracking || '';
        institutionData.teachingProcess = request.teachingProcess || '';
        institutionData.institutionName = request.institutionName || '';
        institutionData.institutionPosition = request.institutionPosition || '';
        institutionData.institutionExperience = request.institutionExperience || '';
        institutionData.teacherType = request.teacherType || '';
      }
      
      // Save to the correct collection
      await institutionRef.set(institutionData);
      console.log(`✅ ${typeLabel} created with ID:`, institutionId, 'in collection:', collectionName);
      
    } else {
      console.log(`✅ ${typeLabel} already exists with ID:`, institutionId);
    }
    
    // Update registration request with institutionId and status
    await requestRef.update({
      status: 'approved',
      approvedAt: new Date().toISOString(),
      institutionId: institutionId,
      collectionName: collectionName,
      institutionType: institutionType,
      adminNotes: adminNotes || null
    });
    
    // Return the institutionId in the response
    res.json({
      success: true,
      message: 'Registration approved successfully',
      data: { 
        institutionId: institutionId, 
        registrationId: id,
        institutionType: institutionType,
        collectionName: collectionName
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
    const collectionName = getCollectionName(request.institutionType);
    
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

// FIX: Endpoint to fix existing registrations - MOVES data to correct collection
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
    
    const institutionType = request.institutionType || request.type || 'school';
    const correctCollection = getCollectionName(institutionType);
    const typeLabel = getInstitutionTypeLabel(institutionType);
    
    // Check if institution already exists
    let institutionId = request.institutionId || request.schoolId;
    
    // If institutionId exists, check if it's in the correct collection
    if (institutionId) {
      // Check if the institution is in the correct collection
      const wrongCollection = request.collectionName || 'schools';
      
      if (wrongCollection !== correctCollection) {
        console.log(`⚠️ Institution is in wrong collection: ${wrongCollection}, should be: ${correctCollection}`);
        
        // Get the data from the wrong collection
        const wrongRef = db.ref(`${wrongCollection}/${institutionId}`);
        const wrongSnapshot = await wrongRef.once('value');
        const wrongData = wrongSnapshot.val();
        
        if (wrongData) {
          // Save to the correct collection
          const correctRef = db.ref(`${correctCollection}/${institutionId}`);
          await correctRef.set({ ...wrongData, collectionName: correctCollection });
          
          // Delete from wrong collection
          await wrongRef.remove();
          
          console.log(`✅ Moved institution from ${wrongCollection} to ${correctCollection}`);
        }
      } else {
        console.log(`✅ Institution is already in correct collection: ${correctCollection}`);
      }
    } else {
      // If no institutionId, create the institution in the correct collection
      console.log(`🏫 Creating missing ${typeLabel} in collection: ${correctCollection}`);
      
      const institutionRef = db.ref(correctCollection).push();
      institutionId = institutionRef.key;
      
      // Prepare base institution data
      const institutionData = {
        id: institutionId,
        institutionType: institutionType,
        name: request.name || request.institutionName || '',
        tagline: request.tagline || '',
        establishmentYear: request.establishmentYear || '',
        about: request.about || '',
        address: request.address || '',
        city: request.city || '',
        state: request.state || '',
        pincode: request.pincode || '',
        email: request.email || '',
        phone: request.phone || '',
        website: request.website || '',
        googleMapsEmbedUrl: request.googleMapsEmbedUrl || '',
        facilities: request.facilities || [],
        socialMedia: request.socialMedia || {},
        totalAnnualFee: request.totalAnnualFee || '',
        admissionFee: request.admissionFee || '',
        tuitionFee: request.tuitionFee || '',
        transportFee: request.transportFee || '',
        booksUniformsFee: request.booksUniformsFee || '',
        principalName: request.principalName || '',
        contactPerson: request.contactPerson || '',
        alternatePhone: request.alternatePhone || '',
        officeHours: request.officeHours || '',
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
        registrationCertificate: request.registrationCertificate || '',
        affiliationNumber: request.affiliationNumber || '',
        qualificationCertificates: request.qualificationCertificates || [],
        idProof: request.idProof || '',
        profileImage: request.profileImage || '',
        otherDocuments: request.otherDocuments || [],
        status: 'active',
        registrationId: id,
        createdAt: new Date().toISOString(),
        approvedAt: request.approvedAt || new Date().toISOString()
      };

      // Add institution-specific fields based on type
      if (institutionType === 'school') {
        institutionData.typeOfSchool = request.typeOfSchool || '';
        institutionData.affiliation = request.affiliation || '';
        institutionData.grade = request.grade || '';
        institutionData.ageForAdmission = request.ageForAdmission || '';
        institutionData.language = request.language || '';
        institutionData.studentStrength = request.studentStrength || '';
        institutionData.teacherStrength = request.teacherStrength || '';
        institutionData.studentTeacherRatio = request.studentTeacherRatio || '';
      } else if (institutionType === 'college') {
        institutionData.typeOfCollege = request.typeOfCollege || '';
        institutionData.universityAffiliation = request.universityAffiliation || '';
        institutionData.coursesOffered = request.coursesOffered || '';
        institutionData.duration = request.duration || '';
        institutionData.accreditation = request.accreditation || '';
        institutionData.placementStatistics = request.placementStatistics || '';
        institutionData.departments = request.departments || '';
      } else if (institutionType === 'pu_college') {
        institutionData.board = request.board || '';
        institutionData.streams = request.streams || '';
        institutionData.subjects = request.subjects || '';
        institutionData.programDuration = request.programDuration || '';
        institutionData.competitiveExamPrep = request.competitiveExamPrep || '';
      } else if (institutionType === 'coaching') {
        institutionData.typeOfCoaching = request.typeOfCoaching || '';
        institutionData.classes = request.classes || '';
        institutionData.batchSize = request.batchSize || '';
        institutionData.classDuration = request.classDuration || '';
        institutionData.faculty = request.faculty || '';
        institutionData.studyMaterial = request.studyMaterial || '';
        institutionData.tests = request.tests || '';
        institutionData.doubtSessions = request.doubtSessions || '';
        institutionData.infrastructure = request.infrastructure || '';
        institutionData.demoClass = request.demoClass || '';
        institutionData.flexibleTimings = request.flexibleTimings || '';
      } else if (institutionType === 'teacher') {
        institutionData.teacherName = request.teacherName || '';
        institutionData.qualifications = request.qualifications || '';
        institutionData.experience = request.experience || '';
        institutionData.teachingMode = request.teachingMode || '';
        institutionData.languages = request.languages || '';
        institutionData.specialization = request.specialization || '';
        institutionData.certifications = request.certifications || '';
        institutionData.availability = request.availability || '';
        institutionData.hourlyRate = request.hourlyRate || '';
        institutionData.monthlyPackage = request.monthlyPackage || '';
        institutionData.examPreparation = request.examPreparation || '';
        institutionData.demoFee = request.demoFee || '';
        institutionData.teachingApproach = request.teachingApproach || '';
        institutionData.studyMaterials = request.studyMaterials || '';
        institutionData.sessionDuration = request.sessionDuration || '';
        institutionData.studentLevel = request.studentLevel || '';
        institutionData.classSize = request.classSize || '';
        institutionData.onlinePlatform = request.onlinePlatform || '';
        institutionData.progressReports = request.progressReports || '';
        institutionData.performanceTracking = request.performanceTracking || '';
        institutionData.teachingProcess = request.teachingProcess || '';
        institutionData.institutionName = request.institutionName || '';
        institutionData.institutionPosition = request.institutionPosition || '';
        institutionData.institutionExperience = request.institutionExperience || '';
        institutionData.teacherType = request.teacherType || '';
      }
      
      await institutionRef.set(institutionData);
      console.log(`✅ ${typeLabel} created with ID:`, institutionId, 'in collection:', correctCollection);
    }
    
    // Update registration with correct data
    await requestRef.update({
      institutionId: institutionId,
      collectionName: correctCollection,
      institutionType: institutionType
    });
    
    res.json({
      success: true,
      message: 'Registration fixed successfully',
      data: { 
        institutionId: institutionId, 
        registrationId: id,
        institutionType: institutionType,
        collectionName: correctCollection
      }
    });
    
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
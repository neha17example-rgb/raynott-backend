// Routes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../Controllers/AuthController');
const { verifyAdmin, verifyAuth,verifyParent } = require('../Middleware/authMiddleware'); 
const schoolController = require('../Controllers/SchoolController');
const { upload } = require('../Middleware/uploadMiddleware');
const CollegeController = require('../Controllers/CollegeController');
const PUCollegeController = require('../Controllers/PuCollegeController');
const TuitionCoachingController = require('../Controllers/TuitionCoachingController');
const TeacherController = require('../Controllers/TeachersController');
const RegistrationController = require('../Controllers/RegistrationControleer');
const AdminRegistrationController = require('../Controllers/AdminRegController');
const BestSellersController = require('../Controllers/BestSellers');
const BookDemoController = require('../Controllers/BookaDemoController');
const EnquiryController=require('../Controllers/EnquiryController')

const { db } = require('../firebaseAdmin'); 

router.post('/login', AuthController.loginAdmin);
router.post('/register', AuthController.registerAdmin);

router.post('/parent/login',AuthController.loginParent)
router.post('/parent/register',AuthController.registerParent)
router.get('/parent/data',verifyParent,AuthController.getParentData)

router.get('/admin/user-data', verifyAdmin, AuthController.getUserData);

// Admin Dashboard
router.get('/admin/dashboard', verifyAdmin, (req, res) => {
  res.json({ 
    success: true, 
    message: "Welcome to Admin Dashboard",
    user: req.user 
  });
});

router.get('/parent/dashboard',verifyParent,(req,res)=>{
  res.json({
    success:true,
    message:"Welcome to Parent Dashboard",
    parentData:req.parentData
  })
})

// Institute Dashboard
router.get('/dashboard', verifyAuth, (req, res) => {
  res.json({ 
    success: true, 
    message: "Welcome to Institute Dashboard",
    user: req.user 
  });
});

// Schools Routes
router.post('/admin/addschools', 
  upload.fields([
    { name: 'schoolImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  schoolController.addSchool
);

router.get('/admin/getschools', schoolController.getSchools);
router.get('/admin/getschools/:id', schoolController.getSchool);
router.put('/admin/updateschools/:id', 
  upload.fields([
    { name: 'schoolImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  schoolController.updateSchool
);
router.delete('/admin/del-schools/:id', schoolController.deleteSchool);
router.get('/getschools/filtered', schoolController.getSchoolsWithFilters);
router.post('/admin/schools/:schoolId/reviews', schoolController.addReview);
router.get('/schools/:schoolId/reviews', schoolController.getReviews);
router.put('/schools/:schoolId/reviews/:reviewId/like', schoolController.likeReview);
router.put('/schools/:schoolId/reviews/:reviewId/dislike', schoolController.dislikeReview);

// Colleges Routes
router.post('/admin/addcolleges', 
  upload.fields([
    { name: 'collegeImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  CollegeController.addCollege
);

router.get('/admin/getcolleges', CollegeController.getColleges);
router.get('/admin/getcolleges/:id', CollegeController.getCollege);
router.put('/admin/updatecolleges/:id', 
  upload.fields([
    { name: 'collegeImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  CollegeController.updateCollege
);
router.delete('/admin/del-colleges/:id', CollegeController.deleteCollege);
router.get('/admin/college-types', CollegeController.getAllCollegeTypes);
router.post('/admin/college-types', CollegeController.createCollegeType);
router.delete('/admin/college-types/:id', CollegeController.deleteCollegeType);
router.get('/admin/search/colleges', CollegeController.searchColleges);
router.post('/admin/colleges/:collegeId/reviews', CollegeController.addReview);
router.get('/colleges/:collegeId/reviews', CollegeController.getReviews);
router.put('/colleges/:collegeId/reviews/:reviewId/like', CollegeController.likeReview);
router.put('/colleges/:collegeId/reviews/:reviewId/dislike', CollegeController.dislikeReview);

// PU Colleges Routes
router.post('/admin/addpucolleges', 
  upload.fields([
    { name: 'collegeImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  PUCollegeController.addPUCollege
);

router.get('/admin/getpucolleges', PUCollegeController.getPUColleges);
router.get('/admin/getpucolleges/:id', PUCollegeController.getPUCollege);
router.put('/admin/updatepucolleges/:id', 
  upload.fields([
    { name: 'collegeImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  PUCollegeController.updatePUCollege
);
router.delete('/admin/del-pucolleges/:id', PUCollegeController.deletePUCollege);
router.get('/admin/pucollege-types', PUCollegeController.getAllPUCollegeTypes);
router.post('/admin/pucollege-types', PUCollegeController.createPUCollegeType);
router.delete('/admin/pucollege-types/:id', PUCollegeController.deletePUCollegeType);
router.get('/admin/search/pucolleges', PUCollegeController.searchPUColleges);
router.post('/admin/pucolleges/:puCollegeId/reviews', PUCollegeController.addReview);
router.get('/pucolleges/:puCollegeId/reviews', PUCollegeController.getReviews);
router.put('/pucolleges/:puCollegeId/reviews/:reviewId/like', PUCollegeController.likeReview);
router.put('/pucolleges/:puCollegeId/reviews/:reviewId/dislike', PUCollegeController.dislikeReview);

// Tuition/Coaching Centers Routes
router.post('/admin/addtuitioncoaching', 
  upload.fields([
    { name: 'centerImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  TuitionCoachingController.addTuitionCoaching
);

router.get('/admin/gettuitioncoaching', TuitionCoachingController.getTuitionCoachings);
router.get('/admin/gettuitioncoaching/:id', TuitionCoachingController.getTuitionCoaching);
router.put('/admin/updatetuitioncoaching/:id', 
  upload.fields([
    { name: 'centerImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 }
  ]), 
  TuitionCoachingController.updateTuitionCoaching
);
router.delete('/admin/del-tuitioncoaching/:id', TuitionCoachingController.deleteTuitionCoaching);
router.get('/admin/coaching-types', TuitionCoachingController.getAllCoachingTypes);
router.post('/admin/coaching-types', TuitionCoachingController.createCoachingType);
router.delete('/admin/coaching-types/:id', TuitionCoachingController.deleteCoachingType);
router.get('/admin/search/tuitioncoaching', TuitionCoachingController.searchTuitionCoachings);
router.post('/admin/tuitioncoaching/:tuitionCoachingId/reviews', TuitionCoachingController.addReview);
router.get('/tuitioncoaching/:tuitionCoachingId/reviews', TuitionCoachingController.getReviews);
router.put('/tuitioncoaching/:tuitionCoachingId/reviews/:reviewId/like', TuitionCoachingController.likeReview);
router.put('/tuitioncoaching/:tuitionCoachingId/reviews/:reviewId/dislike', TuitionCoachingController.dislikeReview);

// Teachers Routes
router.post('/admin/addteachers', upload.fields([
  { name: 'profileImage', maxCount: 1 }
]), TeacherController.addTeacher);

router.get('/admin/teachers', TeacherController.getTeachers);
router.get('/admin/professional-teachers', TeacherController.getProfessionalTeachers);
router.get('/admin/personal-mentors', TeacherController.getPersonalMentors);
router.get('/admin/professional-teachers/:id', TeacherController.getProfessionalTeacherDetails);
router.get('/admin/personal-mentors/:id', TeacherController.getPersonalMentorDetails);
router.get('/admin/teachers/filter', TeacherController.getTeachersWithFilters);
router.get('/admin/get-teachers/:id', TeacherController.getTeacher);
router.put('/admin/edit-teachers/:id', upload.fields([
  { name: 'profileImage', maxCount: 1 }
]), TeacherController.updateTeacher);
router.delete('/admin/del-teachers/:id', TeacherController.deleteTeacher);
router.get('/search/professional', TeacherController.searchProfessionalTeachersByName);
router.get('/search/personal', TeacherController.searchPersonalMentorsByName);

router.post('/teachers/professional/:teacherId/reviews', TeacherController.addProfessionalReview);
router.post('/teachers/personal/:teacherId/reviews', TeacherController.addPersonalReview);
router.get('/teachers/professional/:teacherId/reviews', TeacherController.getProfessionalReviews);
router.get('/teachers/personal/:teacherId/reviews', TeacherController.getPersonalReviews);
router.put('/teachers/professional/:teacherId/reviews/:reviewId/like', TeacherController.likeProfessionalReview);
router.put('/teachers/personal/:teacherId/reviews/:reviewId/like', TeacherController.likePersonalReview);
router.put('/teachers/professional/:teacherId/reviews/:reviewId/dislike', TeacherController.dislikeProfessionalReview);
router.put('/teachers/personal/:teacherId/reviews/:reviewId/dislike', TeacherController.dislikePersonalReview);

// Registration Routes
router.post('/submit', 
  upload.fields([
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'affiliationCertificate', maxCount: 1 },
    { name: 'qualificationCertificates', maxCount: 10 },
    { name: 'idProof', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'photos', maxCount: 6 },
    { name: 'otherDocuments', maxCount: 10 }
  ]), 
  RegistrationController.submitRegistration
);

router.get('/status/:id', RegistrationController.getRegistrationStatus);

// Admin Registration Routes
router.get('/admin/pending', AdminRegistrationController.getPendingRegistrations);
router.get('/admin/all', AdminRegistrationController.getAllRegistrations);
router.get('/admin/registrations/:id', AdminRegistrationController.getRegistrationById);
router.put('/admin/approve/:id', AdminRegistrationController.approveRegistration);
router.put('/admin/reject/:id', AdminRegistrationController.rejectRegistration);
router.post('/admin/fix-registration/:id',AdminRegistrationController.fixRegistration);

router.get('/registration/check', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    console.log('📡 Checking registration for email:', email);

    // Query Firebase for registration with this email
    const snapshot = await db.ref('registration_requests')
      .orderByChild('email')
      .equalTo(email)
      .once('value');
    
    let registration = null;
    snapshot.forEach((child) => {
      registration = { 
        id: child.key, 
        ...child.val() 
      };
    });
    
    if (registration) {
      console.log('✅ Found registration:', registration.id);
      res.json({ 
        success: true, 
        data: {
          id: registration.id,
          institutionType: registration.institutionType,
          status: registration.status,
          submittedAt: registration.submittedAt,
          approvedAt: registration.approvedAt,
          rejectedAt: registration.rejectedAt,
          rejectionReason: registration.rejectionReason,
          ...registration
        }
      });
    } else {
      console.log('❌ No registration found for email:', email);
      res.json({ 
        success: false, 
        message: 'No registration found for this email' 
      });
    }
  } catch (error) {
    console.error('❌ Error checking registration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/bestsellers', BestSellersController.getBestSellers);
router.post('/book-demo', BookDemoController.bookDemo);
router.get('/book-demo', BookDemoController.getBookings);


// ============ ENQUIRY ROUTES ============

router.post('/enquiry/submit', EnquiryController.submitEnquiry);

// Parent routes - Get parent's own enquiries
router.get('/parent/enquiries', verifyParent, EnquiryController.getParentEnquiries);
router.get('/parent/enquiries/:id', verifyParent, EnquiryController.getEnquiryById);

router.get('/admin/enquiries', verifyAdmin, EnquiryController.getAllEnquiries);
router.get('/admin/enquiries/:id', verifyAdmin, EnquiryController.getEnquiryById);
router.get('/admin/enquiries/stats', verifyAdmin, EnquiryController.getEnquiryStats);
router.get('/admin/enquiries/institution/:institutionId', verifyAdmin, EnquiryController.getInstitutionEnquiries);
router.put('/admin/enquiries/:id/status', verifyAdmin, EnquiryController.updateEnquiryStatus);
router.post('/admin/enquiries/:id/response', verifyAdmin, EnquiryController.addEnquiryResponse);
router.delete('/admin/enquiries/:id', verifyAdmin, EnquiryController.deleteEnquiry);

// Institution routes - Get enquiries for a specific institution
router.get('/institution/enquiries/:institutionId', EnquiryController.getInstitutionEnquiries);

module.exports = router;
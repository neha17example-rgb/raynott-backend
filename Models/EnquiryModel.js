// Models/EnquiryModel.js
class EnquiryModel {
  constructor(data) {
    this.institutionId = data.institutionId;
    this.institutionName = data.institutionName;
    this.institutionType = data.institutionType;
    this.institutionEmail = data.institutionEmail || null;
    this.institutionPhone = data.institutionPhone || null;
    this.parentName = data.parentName;
    this.parentEmail = data.parentEmail;
    this.parentPhone = data.parentPhone || '';
    this.studentName = data.studentName;
    this.studentClass = data.studentClass;
    this.subject = data.subject;
    this.message = data.message;
    this.preferredContact = data.preferredContact || 'email';
    this.status = data.status || 'pending'; // pending, responded, closed
    this.responses = data.responses || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    const requiredFields = [
      'institutionId', 
      'institutionName', 
      'institutionType',
      'parentName', 
      'parentEmail', 
      'studentName', 
      'studentClass',
      'subject', 
      'message'
    ];

    // Check for required fields
    requiredFields.forEach(field => {
      if (!this[field]) {
        errors.push(`${field} is required`);
      }
    });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.parentEmail && !emailRegex.test(this.parentEmail)) {
      errors.push('Invalid email format');
    }

    // Validate phone number (optional but if provided should be valid)
    if (this.parentPhone) {
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(this.parentPhone)) {
        errors.push('Phone number must be 10-15 digits');
      }
    }

    // Validate preferred contact
    const validContacts = ['email', 'phone', 'both'];
    if (this.preferredContact && !validContacts.includes(this.preferredContact)) {
      errors.push('Preferred contact must be email, phone, or both');
    }

    // Validate status
    const validStatuses = ['pending', 'responded', 'closed'];
    if (this.status && !validStatuses.includes(this.status)) {
      errors.push('Status must be pending, responded, or closed');
    }

    return errors;
  }

  // Add a response to the enquiry
  addResponse(responseData) {
    const response = {
      id: `resp_${Date.now()}`,
      ...responseData,
      createdAt: new Date().toISOString()
    };
    this.responses.push(response);
    this.updatedAt = new Date().toISOString();
    return response;
  }

  // Update enquiry status
  updateStatus(newStatus) {
    const validStatuses = ['pending', 'responded', 'closed'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status. Must be pending, responded, or closed');
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
  }

  // Convert to plain object for Firebase
  toJSON() {
    return {
      institutionId: this.institutionId,
      institutionName: this.institutionName,
      institutionType: this.institutionType,
      institutionEmail: this.institutionEmail,
      institutionPhone: this.institutionPhone,
      parentName: this.parentName,
      parentEmail: this.parentEmail,
      parentPhone: this.parentPhone,
      studentName: this.studentName,
      studentClass: this.studentClass,
      subject: this.subject,
      message: this.message,
      preferredContact: this.preferredContact,
      status: this.status,
      responses: this.responses,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = EnquiryModel;
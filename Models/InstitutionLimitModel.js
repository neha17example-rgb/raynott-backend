// Models/InstitutionLimitModel.js
class InstitutionLimitModel {
  constructor(data) {
    this.institutionId = data.institutionId;
    this.institutionName = data.institutionName || '';
    this.institutionType = data.institutionType || '';
    this.institutionEmail = data.institutionEmail || '';
    
    // Limit configuration
    this.freeLimit = data.freeLimit || 5;           // Default free limit
    this.customLimit = data.customLimit || 0;        // Additional unlocked by admin
    this.totalLimit = this.freeLimit + this.customLimit;
    
    // Admin tracking
    this.lastUpdatedBy = data.lastUpdatedBy || 'admin';
    this.lastUpdatedAt = data.lastUpdatedAt || new Date().toISOString();
    
    // History tracking
    this.limitHistory = data.limitHistory || [];
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    
    if (!this.institutionId) errors.push('institutionId is required');
    if (this.customLimit < 0) errors.push('customLimit cannot be negative');
    if (this.freeLimit < 0) errors.push('freeLimit cannot be negative');

    return errors;
  }

  // Add a history entry
  addHistoryEntry(entry) {
    this.limitHistory.push({
      id: `hist_${Date.now()}`,
      ...entry,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  // Update limit
  updateLimit(newCustomLimit, updatedBy = 'admin', note = '') {
    const previousLimit = this.customLimit;
    
    this.customLimit = newCustomLimit;
    this.totalLimit = this.freeLimit + newCustomLimit;
    this.lastUpdatedBy = updatedBy;
    this.lastUpdatedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    // Add to history
    this.addHistoryEntry({
      action: 'update_limit',
      previousLimit,
      newLimit: newCustomLimit,
      updatedBy,
      note
    });
  }

  toJSON() {
    return {
      institutionId: this.institutionId,
      institutionName: this.institutionName,
      institutionType: this.institutionType,
      institutionEmail: this.institutionEmail,
      freeLimit: this.freeLimit,
      customLimit: this.customLimit,
      totalLimit: this.totalLimit,
      lastUpdatedBy: this.lastUpdatedBy,
      lastUpdatedAt: this.lastUpdatedAt,
      limitHistory: this.limitHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = InstitutionLimitModel;
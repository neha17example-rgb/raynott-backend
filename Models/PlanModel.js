// Models/PlanModel.js
class PlanModel {
  constructor(data = {}) {
    this.id = data.id || `plan_${Date.now()}`;
    this.name = data.name || '';
    this.enquiries = Number(data.enquiries) || 0;
    this.price = Number(data.price) || 0;
    this.originalPrice = Number(data.originalPrice) || 0;
    this.popular = Boolean(data.popular);
    this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
    this.order = Number(data.order) || 0;
    this.badge = data.badge || '';
    this.features = Array.isArray(data.features) ? data.features.filter(f => f?.trim()) : [];
    this.description = data.description || '';
    this.validityDays = Number(data.validityDays) || 365;
    this.ctaText = data.ctaText || 'Buy Plan';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.name?.trim()) errors.push('Plan name is required');
    if (this.enquiries < 1) errors.push('Enquiries must be at least 1');
    if (this.price < 0) errors.push('Price must be a valid number');
    if (this.originalPrice > 0 && this.originalPrice < this.price) {
      errors.push('Original price should be >= selling price');
    }
    if (!this.features || this.features.length === 0) {
      errors.push('At least one feature is required');
    }
    return errors;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      enquiries: this.enquiries,
      price: this.price,
      originalPrice: this.originalPrice,
      popular: this.popular,
      isActive: this.isActive,
      order: this.order,
      badge: this.badge,
      features: this.features,
      description: this.description,
      validityDays: this.validityDays,
      ctaText: this.ctaText,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = PlanModel;
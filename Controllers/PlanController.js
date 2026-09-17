const { db } = require('../firebaseAdmin');
const PlanModel = require('../Models/PlanModel');

// ============ GET ALL PLANS ============
const getAllPlans = async (req, res) => {
  try {
    const { activeOnly } = req.query;

    const plansRef = db.ref('plans');
    const snapshot = await plansRef.once('value');
    const plans = snapshot.val() || {};

    let plansArray = Object.values(plans);

    // Filter active only (for institution side)
    if (activeOnly === 'true') {
      plansArray = plansArray.filter(p => p.isActive === true);
    }

    // Sort by order, then by price
    plansArray.sort((a, b) => {
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return (a.price || 0) - (b.price || 0);
    });

    res.status(200).json({
      success: true,
      data: plansArray,
      count: plansArray.length
    });

  } catch (error) {
    console.error('❌ Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
      error: error.message
    });
  }
};

// ============ GET SINGLE PLAN ============
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const planRef = db.ref(`plans/${id}`);
    const snapshot = await planRef.once('value');
    const plan = snapshot.val();

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.status(200).json({
      success: true,
      data: { id, ...plan }
    });

  } catch (error) {
    console.error('❌ Error fetching plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan',
      error: error.message
    });
  }
};

// ============ CREATE PLAN (Admin) ============
const createPlan = async (req, res) => {
  try {
    console.log('📝 Creating plan:', req.body);

    const plan = new PlanModel({
      ...req.body,
      id: `plan_${Date.now()}`
    });

    const validationErrors = plan.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // If this plan is marked as popular, unmark others
    if (plan.popular) {
      const allPlansRef = db.ref('plans');
      const snapshot = await allPlansRef.once('value');
      const allPlans = snapshot.val() || {};
      const updates = {};
      Object.keys(allPlans).forEach(key => {
        if (allPlans[key].popular) {
          updates[`${key}/popular`] = false;
        }
      });
      if (Object.keys(updates).length > 0) {
        await allPlansRef.update(updates);
      }
    }

    const planRef = db.ref(`plans/${plan.id}`);
    await planRef.set(plan.toJSON());

    console.log('✅ Plan created:', plan.id);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan.toJSON()
    });

  } catch (error) {
    console.error('❌ Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
};

// ============ UPDATE PLAN (Admin) ============
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const planRef = db.ref(`plans/${id}`);
    const existingSnapshot = await planRef.once('value');
    const existingPlan = existingSnapshot.val();

    if (!existingPlan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const plan = new PlanModel({
      ...existingPlan,
      ...req.body,
      id
    });

    const validationErrors = plan.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // If this plan is being marked as popular, unmark others
    if (plan.popular && !existingPlan.popular) {
      const allPlansRef = db.ref('plans');
      const snapshot = await allPlansRef.once('value');
      const allPlans = snapshot.val() || {};
      const updates = {};
      Object.keys(allPlans).forEach(key => {
        if (key !== id && allPlans[key].popular) {
          updates[`${key}/popular`] = false;
        }
      });
      if (Object.keys(updates).length > 0) {
        await allPlansRef.update(updates);
      }
    }

    plan.updatedAt = new Date().toISOString();
    await planRef.set(plan.toJSON());

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: plan.toJSON()
    });

  } catch (error) {
    console.error('❌ Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
};

// ============ DELETE PLAN (Admin) ============
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const planRef = db.ref(`plans/${id}`);
    const snapshot = await planRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await planRef.remove();

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
};

// ============ TOGGLE PLAN ACTIVE (Admin) ============
const togglePlanActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }

    const planRef = db.ref(`plans/${id}`);
    const snapshot = await planRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await planRef.update({
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Plan ${isActive ? 'activated' : 'deactivated'}`,
      data: { id, isActive }
    });

  } catch (error) {
    console.error('❌ Error toggling plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle plan status',
      error: error.message
    });
  }
};

// ============ SEED DEFAULT PLANS (Admin - one time) ============
const seedDefaultPlans = async (req, res) => {
  try {
    const defaultPlans = [
      {
        id: 'basic',
        name: 'Basic',
        enquiries: 10,
        price: 500,
        originalPrice: 700,
        popular: false,
        isActive: true,
        order: 0,
        badge: '',
        badgeColor: '#f97316',
        features: ['10 additional enquiries', 'Email & phone access', 'Priority support'],
        validityDays: 365
      },
      {
        id: 'standard',
        name: 'Standard',
        enquiries: 25,
        price: 1000,
        originalPrice: 1500,
        popular: true,
        isActive: true,
        order: 1,
        badge: 'MOST POPULAR',
        badgeColor: '#8b5cf6',
        features: ['25 additional enquiries', 'Email & phone access', 'Priority support', 'Better visibility'],
        validityDays: 365
      },
      {
        id: 'premium',
        name: 'Premium',
        enquiries: 50,
        price: 1800,
        originalPrice: 2800,
        popular: false,
        isActive: true,
        order: 2,
        badge: 'BEST VALUE',
        badgeColor: '#22c55e',
        features: ['50 additional enquiries', 'Email & phone access', 'Priority support', 'Better visibility', 'Featured badge'],
        validityDays: 365
      }
    ];

    const updates = {};
    defaultPlans.forEach(plan => {
      const model = new PlanModel(plan);
      updates[plan.id] = model.toJSON();
    });

    await db.ref('plans').update(updates);

    res.status(200).json({
      success: true,
      message: 'Default plans seeded',
      data: defaultPlans
    });

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed plans',
      error: error.message
    });
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  seedDefaultPlans
};
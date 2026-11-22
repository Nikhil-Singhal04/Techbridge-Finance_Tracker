const analyticsService = require('../services/analytics.service');

const getSummary = async (req, res, next) => {
  try {
    const data = await analyticsService.getSummary(req.user, req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Summary analytics retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getMonthly = async (req, res, next) => {
  try {
    const data = await analyticsService.getMonthly(req.user, req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Monthly analytics retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getYearly = async (req, res, next) => {
  try {
    const data = await analyticsService.getYearly(req.user, req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Yearly analytics retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getCategoryBreakdown = async (req, res, next) => {
  try {
    const data = await analyticsService.getCategoryBreakdown(req.user, req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Category breakdown retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getTrends(req.user, req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Trends analytics retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getMonthly,
  getYearly,
  getCategoryBreakdown,
  getTrends,
};

const categoriesService = require('../services/categories.service');

/**
 * Controller to list categories
 */
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await categoriesService.getAllCategories(type);

    res.status(200).json({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
};

const Expense = require('../models/Expense');

/**
 * @desc    Create a new expense
 * @route   POST /api/expenses
 * @access  Private (Admin Only)
 */
const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, description, paidTo } = req.body;

    const expense = await Expense.create({
      title,
      category,
      amount,
      date: date || Date.now(),
      description,
      paidTo,
    });

    return res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all expenses with filter and pagination
 * @route   GET /api/expenses
 * @access  Private (Admin Only)
 */
const getExpenses = async (req, res, next) => {
  try {
    const { category, searchTerm, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { paidTo: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end of day for the end date to include matches on that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const skip = (p - 1) * l;

    const expenses = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(l);

    const totalExpensesCount = await Expense.countDocuments(filter);

    // Calculate sum of filtered expenses for UI convenience
    const totalAmountRes = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const filteredTotalAmount = totalAmountRes.length > 0 ? totalAmountRes[0].total : 0;

    return res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          total: totalExpensesCount,
          pages: Math.ceil(totalExpensesCount / l),
          page: p,
          limit: l,
        },
        filteredTotalAmount,
      },
      message: 'Expenses fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an expense
 * @route   PUT /api/expenses/:id
 * @access  Private (Admin Only)
 */
const updateExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, description, paidTo } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Expense record not found',
      });
    }

    if (title !== undefined) expense.title = title;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = date;
    if (description !== undefined) expense.description = description;
    if (paidTo !== undefined) expense.paidTo = paidTo;

    const updatedExpense = await expense.save();

    return res.status(200).json({
      success: true,
      data: updatedExpense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an expense record
 * @route   DELETE /api/expenses/:id
 * @access  Private (Admin Only)
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Expense record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Expense record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
};

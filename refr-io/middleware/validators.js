const { body, validationResult } = require("express-validator");

// Middleware to run the validation and handle errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  // Extract the first error message to send back to the client
  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push({ [err.path]: err.msg }));

  return res.status(422).json({
    error: extractedErrors[0][Object.keys(extractedErrors[0])[0]], // Send the first error message as a string
  });
};

// Validation rules for the signup route
const signupValidationRules = () => {
  return [
    // name must not be empty
    body("name").notEmpty().withMessage("Name is required."),
    // email must be a valid email
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address."),
    // password must be at least 8 chars long
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .matches(/[A-Z]/)
      .withMessage("Password must contain an uppercase letter.")
      .matches(/[a-z]/)
      .withMessage("Password must contain a lowercase letter.")
      .matches(/[0-9]/)
      .withMessage("Password must contain a number.")
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage("Password must contain a special character."),
  ];
};

const referralValidationRules = () => {
  return [
    body("title").notEmpty().withMessage("Title is required.").trim().escape(),
    body("link").isURL().withMessage("A valid URL is required."),
    body("description").optional().trim().escape(),
    body("category")
      .notEmpty()
      .withMessage("Category is required.")
      .isIn([
        "Finance",
        "Food",
        "Shopping",
        "Travel",
        "Services",
        "Software",
        "Gaming",
        "Other",
      ])
      .withMessage("Invalid category."),
  ];
};

module.exports = {
  signupValidationRules,
  referralValidationRules, // Export the new rules
  validate,
};

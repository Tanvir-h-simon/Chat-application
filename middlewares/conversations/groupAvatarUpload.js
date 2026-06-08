const multer = require("multer");
const uploader = require("../../utilities/singleUploader");

// Stores a group photo in public/avatars (same place as user avatars).
function groupAvatarUpload(req, res, next) {
  const upload = uploader(
    "avatars",
    ["image/jpeg", "image/jpg", "image/png"],
    2 * 1024 * 1024,
    "Only .jpg, .jpeg, and .png formats are allowed.",
  );
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      const isClientError =
        err instanceof multer.MulterError ||
        err.message.startsWith("Only .jpg");
      return res
        .status(isClientError ? 400 : 500)
        .json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file was uploaded." });
    }
    next();
  });
}

module.exports = groupAvatarUpload;

const multer = require("multer");
const uploader = require("../../utilities/singleUploader");

// Stores one message attachment in public/attachments/. Reuses the shared
// singleUploader utility, same approach as the avatar upload.
function attachmentUpload(req, res, next) {
  const upload = uploader(
    "attachments",
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ],
    5 * 1024 * 1024, // 5MB
    "Only images (jpg, png, gif, webp) and PDF files up to 5MB are allowed.",
  );

  upload.single("attachment")(req, res, (err) => {
    if (err) {
      const isClientError =
        err instanceof multer.MulterError ||
        err.message.startsWith("Only images");
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

module.exports = attachmentUpload;

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary-v2");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ai-interview-resumes",
    resource_type: "raw",
    // NOTE: intentionally not using Cloudinary's `allowed_formats` here —
    // it unreliably rejects valid .doc files under resource_type "raw"
    // ("An unknown file format not allowed"). File-type validation is
    // handled below via our own fileFilter (mime type + extension check)
    // before the file ever reaches Cloudinary.
  },
});

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },   // 5MB max — resumes are small text documents
  fileFilter: (req, file, cb) => {
    const ext = "." + (file.originalname.split(".").pop() || "").toLowerCase();
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extOk  = ALLOWED_EXTENSIONS.includes(ext);
    // Some browsers/OS send generic mimetypes (e.g. application/octet-stream) for
    // legacy .doc files — accept if EITHER the mimetype OR the extension checks out,
    // as long as the extension is one we recognize.
    if (!extOk || (!mimeOk && file.mimetype !== "application/octet-stream")) {
      return cb(new Error("Only PDF, DOC, or DOCX files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = { cloudinary, upload };
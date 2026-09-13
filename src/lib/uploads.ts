import path from "path";

export function uploadDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");
}

import { multipart } from "./multipart";

import { MultipartFile } from "./types";

declare global {
  namespace Express {
    export interface Request {
      file: MultipartFile;
      files: MultipartFile[];
    }
  }
}

export * from "./multipart";
export { MultipartFile, MultipartMiddleware, MultipartOptions } from "./types";
export default multipart;

import crypto from "crypto";

import { MultipartOptions } from "./types";

export const defaultOptions: MultipartOptions = {
  maxSize: 8388608,
  maxFieldSize: 1048576,
  maxFieldNameSize: 100,
  acceptedTypes: undefined,
  destination: "./",
  preserveExtensions: false,
  verifyMagic: false,

  onInvalidMagic: (
    _file: NodeJS.ReadableStream,
    _contentMime?: string,
    _binaryMime?: string
  ) => {
    return false;
  },

  fileName: (_originalName: string, _mime: string) => {
    return crypto.randomBytes(16).toString("hex");
  },
};

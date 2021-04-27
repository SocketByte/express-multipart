import { NextFunction, Request, Response } from "express";

export type MultipartMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export type MultipartFile = {
  /**
   * Full path to the persisted file.
   */
  path: string;
  /**
   * Name of the file that was persisted on a disk.
   */
  name: string;
  /**
   * Name of the file that was received in the form-data request.
   */
  originalName: string;
  /**
   * Mime type (based on the file extension).
   */
  mime: string;
  /**
   * File extension.
   */
  extension: string;
  /**
   * File encoding.
   */
  encoding: string;
  /**
   * Path to the storage directory.
   */
  destination: string;
};

export type MultipartOptions = {
  /**
   * Max size of a single file in bytes.
   *
   * *Default: 8388608 (8 MB)*
   */
  maxSize?: number;
  /**
   * Max size of a field in bytes.
   *
   * *Default: 1048576 (1 MB)*
   */
  maxFieldSize?: number;
  /**
   * Max size of a field name in bytes.
   *
   * *Default: 100 (100 B)*
   */
  maxFieldNameSize?: number;
  /**
   * Whitelisted mime types. (All if undefined)
   *
   * *Default: all*
   */
  acceptedTypes?: string[];
  /**
   * A destination where files will be saved on a disk.
   *
   * *Default: ./*
   */
  destination?: string;
  /**
   * If true, extensions will be preserved in the file name.
   *
   * *Default: false*
   *
   * **Warning: Preserving extensions can possibly be dangerous for security reasons, should always be used with `verifyMagic` set to `true`.**
   */
  preserveExtensions?: boolean;
  /**
   * If true, magic bytes will be verified to check if the binary data of the file is correct.
   *
   * *Default: false*
   *
   * * If the file is not represented in a known (or accepted) binary format, then {@link onInvalidMagic} will be ran.
   * * If the file binary data does not match request's `Content-Type`, then {@link onInvalidMagic} will be ran.
   * * If any of the above conditions is met and {@link onInvalidMagic} is not declared, then the file will be rejected.
   */
  verifyMagic?: boolean;
  /**
   * This function will be executed if magic bytes verification couldn't be successfully performed. See {@link verifyMagic} for more information.
   *
   * If the function returns `false`, then the file will be rejected, otherwise `Content-Type` will be used.
   */
  onInvalidMagic?: (
    file: NodeJS.ReadableStream,
    contentMime: string,
    binaryMime?: string
  ) => boolean;

  /**
   * The result of this function will work as a new file name persisted on a disk.
   *
   * *Default: random hex string*
   */
  fileName?: (originalName: string, mime: string) => string;
};

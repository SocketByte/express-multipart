import { defaultOptions } from "./defaults";
import { handleRequest } from "./handler";
import { MultipartMiddleware, MultipartOptions } from "./types";

/**
 * A class containing all useful middlewares for multipart request handling.
 * It also stores your global {@link MultipartOptions}.
 *
 * **Should be created with** {@link default}
 *
 * ```typescript
 * import multipart from "express-multipart";
 *
 * const mp = multipart({});
 * ```
 */
export class Multipart {
  /**
   * @ignore
   */
  globalOptions: MultipartOptions;

  /**
   * @ignore
   */
  constructor(globalOptions?: MultipartOptions) {
    if (globalOptions === undefined) {
      this.globalOptions = { ...defaultOptions };
      return;
    }

    this.globalOptions = { ...defaultOptions, ...globalOptions };
  }

  /**
   * Middleware used for text-based multipart data. *It does not parse any files.*
   *
   * ```typescript
   * app.post("texts", mp.text(), (req, res) => {
   *   const myText: string = req.body.myText;
   * })
   * ```
   * @param options Local multipart options merged with global options.
   * @returns Middleware for use in Express-style apps.
   */
  text(options?: MultipartOptions): MultipartMiddleware {
    return handleRequest(0, { ...this.globalOptions, ...options }, undefined);
  }

  /**
   * Middleware used for file and text-based multipart data.
   * *It parses a singular file field and multiple text fields.*
   *
   * ```typescript
   * app.post("upload", mp.file("myFile"), (req, res) => {
   *   const myFile: MultipartFile = req.file;
   * })
   * ```
   * @param fieldName `multipart/form-data` field name that contains a file.
   * @param options Local multipart options merged with global options.
   * @returns Middleware for use in Express-style apps.
   */
  file(fieldName: string, options?: MultipartOptions): MultipartMiddleware {
    return handleRequest(1, { ...this.globalOptions, ...options }, fieldName);
  }

  /**
   * Middleware used for file and text-based multipart data.
   * *It parses multiple file fields and multiple text fields.*
   *
   * ```typescript
   * app.post("upload", mp.files("myFiles", 3), (req, res) => {
   *   const myFiles: MultipartFile[] = req.files;
   * })
   * ```
   * @param fieldName `multipart/form-data` field name that contains an array of files.
   * @param maxFiles Max amount of files in the array.
   * @param options Local multipart options merged with global options.
   * @returns Middleware for use in Express-style apps.
   */
  files(
    fieldName: string,
    maxFiles: number = 1,
    options?: MultipartOptions
  ): MultipartMiddleware {
    return handleRequest(
      maxFiles,
      {
        ...this.globalOptions,
        ...options,
      },
      fieldName
    );
  }
}

/**
 * Constructor for the {@link Multipart}
 *
 * ```typescript
 * import multipart from "express-multipart";
 *
 * const mp = multipart();
 * ```
 *
 * @param options Global multipart options that will be applied for all multipart requests.
 * @return New {@link Multipart} instance with specified option parameters (if there are any).
 */
export const multipart = (options?: MultipartOptions) => {
  if (options === undefined) {
    return new Multipart();
  }

  return new Multipart(options);
};

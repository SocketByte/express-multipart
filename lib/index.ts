import { NextFunction, Request, Response } from "express";
import Busboy from "busboy";
import FileType from "file-type";

// @ts-ignore
import appendField from "append-field";
import path from "path";
import fs from "fs";
import crypto from "crypto";

declare global {
  namespace Express {
    export interface Request {
      /**
       * Received file. `undefined` if an error occurred.
       */
      file: MultipartFile;
      /**
       * Received files.
       */
      files: MultipartFile[];
    }
  }
}

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

const defaultOptions: MultipartOptions = {
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

const handle = (
  maxFiles: number,
  options: MultipartOptions,
  fieldName?: string
): MultipartMiddleware => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = Object.create(null);

    const busboy = new Busboy({
      headers: req.headers,
      limits: {
        fieldNameSize: options.maxFieldNameSize,
        fieldSize: options.maxFieldSize,
        fileSize: options.maxSize,
        files: maxFiles,
      },
    });

    const files: MultipartFile[] = [];

    const done = (err?: Error) => {
      req.unpipe(busboy);
      req.on("readable", req.read.bind(req));

      busboy.removeAllListeners();

      req.file = files[0];
      req.files = files;
      return next(err);
    };

    const readChunk = async (
      file: NodeJS.ReadableStream,
      filename: string
    ): Promise<FileType.FileTypeResult> => {
      let chunk = file.read(4100);
      if (!chunk) {
        return new Promise((resolve) => {
          file.once("readable", () => resolve(readChunk(file, filename)));
        });
      }
      let { ext, mime } = (await FileType.fromBuffer(chunk as Buffer)) || {};
      if (!mime || !ext) {
        throw new Error("Unsupported file type: " + filename);
      }
      file.unshift(chunk);
      return { ext, mime };
    };

    busboy.on(
      "file",
      async (
        fieldname: string,
        file: NodeJS.ReadableStream,
        filename: string,
        encoding: string,
        mimetype: string
      ) => {
        if (fieldName !== fieldname) {
          file.resume();
          return;
        }

        if (
          options.acceptedTypes &&
          !options.acceptedTypes.includes(mimetype)
        ) {
          return;
        }

        if (options.verifyMagic) {
          if (!options.onInvalidMagic) {
            return;
          }

          try {
            let { mime } = await readChunk(file, filename);

            if (mime !== mimetype) {
              if (!options.onInvalidMagic(file, mimetype, mime)) {
                return;
              }
            }
            if (
              options.acceptedTypes &&
              !options.acceptedTypes.includes(mime)
            ) {
              if (options.onInvalidMagic(file, mimetype, mime)) {
                return;
              }
            }
          } catch (err) {
            if (!options.onInvalidMagic(file, mimetype, undefined)) {
              return;
            }
          }
        }

        const name = options.fileName
          ? options.fileName(filename, mimetype)
          : filename;

        const parts = filename.split(".");

        const fileName = options.preserveExtensions
          ? name + "." + parts[1]
          : name;

        var dest = path.join(options.destination!, path.basename(fileName));
        var writeStream = fs.createWriteStream(dest);
        file.pipe(writeStream);

        files.push({
          path:
            (options.destination?.endsWith("/")
              ? options.destination
              : options.destination + "/") + fileName,
          name: fileName,
          originalName: filename,
          mime: mimetype,
          extension: parts[1],
          encoding: encoding,
          destination: options.destination!,
        });
      }
    );

    busboy.on("field", (fieldname: string, value: any) => {
      appendField(req.body, fieldname, value);
    });

    busboy.on("error", function (err: Error) {
      done(err);
    });
    busboy.on("partsLimit", function () {
      done(new Error("Limit error."));
    });
    busboy.on("filesLimit", function () {
      done(new Error("Limit error."));
    });
    busboy.on("fieldsLimit", function () {
      done(new Error("Limit error."));
    });
    busboy.on("finish", function () {
      done();
    });
    req.pipe(busboy);
  };
};

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
   * app.post("texts", mp.text(), (_req, res) => {
   *   const myText: string = res.locals.body.myText;
   * })
   * ```
   * @param options Local multipart options merged with global options.
   * @returns Middleware for use in Express-style apps.
   */
  text(options?: MultipartOptions): MultipartMiddleware {
    return handle(0, { ...this.globalOptions, ...options }, undefined);
  }

  /**
   * Middleware used for file and text-based multipart data.
   * *It parses a singular file field and multiple text fields.*
   *
   * ```typescript
   * app.post("upload", mp.file("myFile"), (_req, res) => {
   *   const myFile: MultipartFile = res.locals.file;
   * })
   * ```
   * @param fieldName `multipart/form-data` field name that contains a file.
   * @param options Local multipart options merged with global options.
   * @returns Middleware for use in Express-style apps.
   */
  file(fieldName: string, options?: MultipartOptions): MultipartMiddleware {
    return handle(1, { ...this.globalOptions, ...options }, fieldName);
  }

  /**
   * Middleware used for file and text-based multipart data.
   * *It parses multiple file fields and multiple text fields.*
   *
   * ```typescript
   * app.post("upload", mp.files("myFiles", 3), (_req, res) => {
   *   const myFiles: MultipartFile[] = res.locals.files;
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
    return handle(
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
 * const mp = multipart({});
 * ```
 *
 * @param options Global multipart options that will be applied for all multipart requests.
 * @return New {@link Multipart} instance with specified option parameters (if there are any).
 */
const multipart = (options?: MultipartOptions) => {
  if (options === undefined) {
    return new Multipart();
  }

  return new Multipart(options);
};

export default multipart;

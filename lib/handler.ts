import { MultipartFile, MultipartMiddleware, MultipartOptions } from "./types";
import { NextFunction, Request, Response } from "express";
import Busboy from "busboy";
import FileType from "file-type";

// @ts-ignore
import appendField from "append-field";

import path from "path";
import fs from "fs";

export const handleRequest = (
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

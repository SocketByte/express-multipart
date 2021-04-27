# express-multipart ⚡

High performance lightweight Express middleware for handling `multipart/form-data` requests built with [Busboy](https://www.npmjs.com/package/busboy) 🔥

## Features

- Handling single and multiple files.
- Persisting received files on a disk.
- Multitude of fancy knobs to play with!
- Built-in magic byte verification with [file-type](https://www.npmjs.com/package/file-type).
- Easy integration with other file processing libraries.
- Modern, clean and built natively with **TypeScript** 🐋

## Quick Start

### npm

```
npm install express-multipart
```

### yarn

```
yarn add express-multipart
```

```typescript
import express from "express";
import multipart from "express-multipart";

(async () => {
  const app = express();

  const mp = multipart({
    preserveExtensions: true,
    destination: "./uploads",
  });

  app.post("/upload", mp.files("myfiles", 2), (req, res) => {
    const file1 = req.files[0];
    const file2 = req.files[0];
    res.send("😊");
  });

  app.post("/single", mp.file("myfile"), (req, res) => {
    const file = req.file;
    res.send("😃");
  });

  app.post("/onlytext", mp.text(), (req, res) => {
    const value = req.body.myfieldname;
    res.send("😁");
  });

  app.listen(3000, () => {
    console.log("Express server running.");
  });
})();
```

You can find more information on the [official documentation](http://socketbyte.github.io/express-multipart).

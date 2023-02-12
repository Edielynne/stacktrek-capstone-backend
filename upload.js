const multer = require('multer')

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./public/images"); //important this is a direct path fron our current file to storage location
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "--" + file.originalname);
    },
  });

const upload = multer({ storage : fileStorage })

 module.exports = upload
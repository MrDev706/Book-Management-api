const bookModel = require("../models/bookModel");
const reviewModel = require("../models/reviewModel")
const userModel = require("../models/userModel")
var mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const moment = require("moment")
const aws= require("aws-sdk")


const objectIdValid = function (value) {
  return mongoose.Types.ObjectId.isValid(value)
}

const valid = function (value) {
  if (typeof (value) === 'undefined' || value === null) return false
  if (typeof (value) === "string" && value.trim().length == 0) return false
  return true
}
const dataExist = function (data) {
  if (Object.keys(data).length != 0) return true
}
const ISBNregex = function (ISBN) {
  let regex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;
  return regex.test(ISBN)
}






aws.config.update({
  accessKeyId: "AKIAY3L35MCRVFM24Q7U",
  secretAccessKeyId: "qGG1HE0qRixcW1T1Wg1bv+08tQrIkFVyDFqSft4J",
  region: "ap-south-1"
})

let uploadFile= async ( file) =>{
 return new Promise( function(resolve, reject) {
  // this function will upload file to aws and return the link
  let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

  var uploadParams= {
      ACL: "public-read",
      Bucket: "classroom-training-bucket",  //HERE
      Key: "abc/" + file.originalname, //HERE 
      Body: file.buffer
  }


  s3.upload( uploadParams, function (err, data ){
      if(err) {
          return reject({"error": err})
      }
      console.log(data)
      console.log("file uploaded succesfully")
      return resolve(data.Location)
  })

  // let data= await s3.upload( uploadParams)
  // if( data) return data.Location
  // else return "there is an error"

 })
}

const a= async function(req, res){

  try{
      let files= req.files
      if(files && files.length>0){
          //upload to s3 and get the uploaded link
          // res.send the link back to frontend/postman
          let uploadedFileURL= await uploadFile( files[0] )
          res.status(201).send({msg: "file uploaded succesfully", data: uploadedFileURL})
      }
      else{
          res.status(400).send({ msg: "No file found" })
      }
      
  }
  catch(err){
      res.status(500).send({msg: err})
  }
  
};

module.exports.a =a






const createBook = async function (req, res) {
  try {
    const data = req.body;
    // const cover=req.bookCover

    if (!dataExist(data))
      return res.status(400).send({ status: false, message: "please provide data" });

    const { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = data;

    if (!valid(title)) return res.status(400).send({ status: false, message: "please provide title" });
    const checkTitle = await bookModel.findOne({ title: title, isDeleted: false, });
    if (checkTitle) return res.status(400).send({ status: false, message: `${title} already exist` });

    if (!valid(excerpt)) return res.status(400).send({ status: false, message: "please provide excerpt" });

    if (!valid(userId)) return res.status(400).send({ status: false, message: "please provide userId" });
    if (!objectIdValid(userId)) return res.status(400).send({ status: false, message: "userId is invalid" });
    const checkUser = await userModel.findById(userId);
    if (!checkUser) return res.status(404).send({ status: false, message: "User not found" });
    let token = req.headers["x-api-key"];
    let decodedToken = jwt.verify(token, "BOOK-MANAGEMENT");
    if (req.body.userId != decodedToken.userId) return res.status(403).send({ status: false, message: "users only use their profile.." });


    if (!valid(ISBN)) return res.status(400).send({ status: false, message: "please provide ISBN" });
    if (!ISBNregex(ISBN)) return res.status(400).send({ status: false, message: "please provide valid ISBN" });
    const checkISBN = await bookModel.findOne({ ISBN: ISBN, isDeleted: false, });
    if (checkISBN) return res.status(400).send({ status: false, message: "book alredy exist with this ISBN" });

    if (!valid(category)) return res.status(400).send({ status: false, message: "please provide category" });
    if (!subcategory) return res.status(400).send({ status: false, message: "please provide subcategory" });

    if (!valid(releasedAt)) return res.status(400).send({ status: false, message: "please provide released date" });

    if (!moment(releasedAt, "YYYY-MM-DD", true).isValid()) return res.status(400).send({ status: false, message: "Enter a valid date with the format (YYYY-MM-DD)..." });


  //   if(bookCover && bookCover.length>0){
  //     //upload to s3 and get the uploaded link
  //     // res.send the link back to frontend/postman
  //     let bookCover= await uploadFile(bookCover[0] )
  //         data.bookCover= bookCover
  //     // res.status(201).send({msg: "file uploaded succesfully", data: uploadedFileURL})
  // }
  // else{
  //     res.status(400).send({ msg: "No file found" })
  // }
  //   // bookCover=data.bookCover


    const saveData = await bookModel.create(data);
    return res.status(201).send({status: true,message: "Success",data: saveData});

  } 
  
  catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

module.exports.createBook = createBook




const getBookByQuery = async function (req, res) {
  try {
    let fil = req.query

    if (Object.keys(fil).length == 0) {
      let bookData = await bookModel.find({ isDeleted: false }).select({ title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
      if (bookData.length == 0) {
        return res.status(404).send({ status: false, message: "No book present" })
      } else {
        let sortedBook = bookData.sort(function (a, b) {
          return a.title.localeCompare(b.title);
        })
        return res.status(200).send({ status: true, message: "Success", data: sortedBook })
      }
    } else {
      if(fil.userId || fil.category || fil.subcategory){
      if(fil){
      let bookData = await bookModel.find({ $and:[fil, { isDeleted: false }] }).select({ title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
      if (bookData.length == 0) {
        return res.status(404).send({ status: false, message: "Book is not present of this query!" })
      } else {
        let sortedBook = bookData.sort(function (a, b) {
          return a.title.localeCompare(b.title);
        })
        return res.status(200).send({ status: true, message: "Success", data: sortedBook })
      }
    }
    }else{
      return res.status(400).send({ status: false, message: "query is invalid" })
    }
  
}
  
  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
}
module.exports.getBookByQuery = getBookByQuery



const getBookByParam = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    if (!objectIdValid(bookId)) return res.status(400).send({ status: false, message: "bookId is invalid" });
    let book = await bookModel.findById(bookId)
    if (!book) return res.status(404).send({ status: false, msg: "Book does not found!!!" })

    if (book.isDeleted == true)
      return res.status(400).send({ status: false, msg: "book is already deleted" })
      
    const { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt } = book

    let reviewData = await reviewModel.find({bookId:bookId,isDeleted: false })

    const bookDetail = { _id, title, excerpt, userId, category, subcategory, isDeleted, reviews, releasedAt, createdAt, updatedAt, reviewData }

    return res.status(200).send({ status: true, msg: "Books List", data: bookDetail })


  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

module.exports.getBookByParam = getBookByParam




const updateBook = async function (req, res) {
  try {

    let bookId = req.params.bookId;

    let data = req.body
    if (!dataExist(data)) return res.status(400).send({ status: false, message: "please provide data that you want to be update.." })

    let { title, excerpt, releaseDate, ISBN } = data

    if (title) {
      if (!valid(title)) return res.status(400).send({ status: false, message: "Title is Invalid" })
      const checkTitle = await bookModel.findOne({ title: title, isDeleted: false });
      if (checkTitle) return res.status(400).send({ status: false, message: "TITLE IS ALREADY EXIST" })
    }


    if (excerpt) {
      if (!valid(excerpt)) return res.status(400).send({ status: false, message: "Invalid excerpt" })
    }


    if (releaseDate) {
      if (!moment(releaseDate, "YYYY-MM-DD", true).isValid()) return res.status(400).send({ status: false, message: "Enter a valid date with the format (YYYY-MM-DD)..." });

    }


    if (ISBN) {
      if (!valid(ISBN)) return res.status(400).send({ status: false, message: "Please provide ISBN " })
      if (!ISBNregex(ISBN)) return res.status(400).send({ status: false, message: "ISBN INVALID FORMAT" })
      const checkISBN = await bookModel.findOne({ ISBN: ISBN, isDeleted: false });
      if (checkISBN) return res.status(200).send({ status: false, message: "ISBN IS ALREADY EXIST" })
    }


    let result = await bookModel.findOneAndUpdate({ _id: bookId, isDeleted: false }, {
      title: title,
      excerpt: excerpt,
      ISBN: ISBN,
      releasedAt: releaseDate
    }, { new: true })

    return res.status(200).send({ status: true, message: "Success", data: result })
  }
  catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }

}

module.exports.updateBook = updateBook



const deleteBook = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    if (!objectIdValid(bookId)) return res.status(400).send({ status: false, message: "bookId is invalid" });
    let book = await bookModel.findById(bookId)
    if (!book) return res.status(404).send({ status: false, message: "book not found" })

    if (book.isDeleted == true) return res.status(404).send({ status: false,message: "book is already deleted" })

    let del = await bookModel.findOneAndUpdate({ _id: bookId }, { $set: { isDeleted: true, deletedAt: Date.now() } }, { new: true })
    return res.status(200).send({ status: true, message: "Success", data: del })


  }
  catch (error) {
    return res.status(500).send({ staus: false, message: error.message })
  }
}

module.exports.deleteBook = deleteBook

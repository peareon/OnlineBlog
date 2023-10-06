const express = require("express");
const cors = require('cors');
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/Blog")
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({dest: 'uploads'})
const fs = require('fs');
const app = express();

app.use(cors({credentials: true, origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+'/uploads'));

const salt = bcrypt.genSaltSync(10);
const secret = 'vmslke34qCA033MClkd7wqw9crho3';



app.post('/register', async function(req, res){
    const  {username, password} = req.body;
    const userDoc = await User.create({nombre:username, password: bcrypt.hashSync(password, salt)})
    res.json(userDoc);
});

app.post('/login', async function(req, res){
    const  {username, password} = req.body;
    const userDoc = await User.findOne({nombre: username});
    const passok = bcrypt.compareSync(password, userDoc.password);
    if (passok){
        jwt.sign({username, id: userDoc._id}, secret, {}, (err, token) =>{
            if(err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            });
        });
    }
    else{
        res.status(400).json('Wrong credentials');
    }
});

app.get('/profile', function(req, res){
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err, info) =>{
        if (err){
            res.json({unsername:null})
        }
        else{
            res.json(info);
        };
    });
});

app.post('/logout', function(req, res){
    res.cookie('token', '').json('ok');
})

app.post('/post', uploadMiddleware.single('file'), async function(req, res){
    const {token} = req.cookies;
    const {title, summary, content} = req.body;
    const {originalname, path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path, newPath);

    jwt.verify(token, secret, {}, async (err, info) =>{
        if (!err){
            const post = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id
            });
            res.json(post);
        }
        else{
            res.json('500');
        };
    });    
});

app.get('/post', async function(req, res){
    res.json(
        await Post.find()
        .populate('author', ['nombre'])
        .sort({createdAt: -1})
        .limit(8)
        );
});

app.put('/post', uploadMiddleware.single('file'), async function(req, res){
    let newPath = false;
    console.log(req.file)
    if (req.file){
        const {originalname, path} = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path+'.'+ext;
        fs.renameSync(path, newPath);
    }
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) =>{
        if (!err){
            const {id, title, summary, content} = req.body;
            const postDoc = await Post.findById(id);
            const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
            if (!isAuthor){
                res.status(400).json('You are not the author');
            }
            console.log(isAuthor)
            await postDoc.updateOne({
                title, 
                summary, 
                content,
                cover: newPath ? newPath: postDoc.cover
            })
            res.json(postDoc);
        }
        else{
            res.json('500');
        };
    }); 
    
});

app.get('/post/:id', async function(req, res){
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['nombre']);
    res.json(postDoc);
});

app.listen(4000, function(req, res){
    console.log("Up And RUnning")
});
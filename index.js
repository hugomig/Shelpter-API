const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server,{
    cors: {
      origin: '*',
    }
});

const bcrypt = require('bcrypt');
const numberOfRounds = 10;

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'SHELPTER';
let db;
let user;
let protect;

MongoClient.connect(url, (err,client) => {
    console.log('connected to the db');
    db = client.db(dbName);
    user = db.collection('user');
    protect = db.collection('protect');
});

app.use(express.json());
app.use(cors());



/* USER */


//voir tous les utilisateurs
app.get('/users', async (req,res) => {
    try{
        const docs = await user.find().toArray();
        res.status(200).json(docs);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//avoir les infos sur un user avec son login
app.get('/users/:login', async (req,res) => {
    try{
        const login = req.params.login;
        const doc = await user.find({login:login}).toArray();
        res.status(200).json(doc);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//savoir si ce login ou cet email existe deja
app.get('/users/exists/:login/:mail', async (req,res) => {
    try{
        const login = req.params.login;
        const mail = req.params.mail;

        const doc = await user.find({$or: [{login:login},{mail:mail}]}).toArray();
        if(doc.length > 0){
            res.send(true);
        }
        else{
            res.send(false);
        }
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//renvoi true si login et mdp correspondent dans la db apres hash du mdp, false sinon
app.get('/users/login/:login/:mdp', async (req,res) => {
    try{
        const login = req.params.login;
        const mdp = req.params.mdp;



        const doc = await user.find({login:login}).toArray();
        if(doc.length > 0){
            const hash = doc[0].mdp;
            const match = await bcrypt.compare(mdp,hash);
            res.send(match);
        }
        else{
            res.send(false);
        }
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//ajoute un utilisateur dans le db
app.post('/users', async (req,res) => {
    try{
        const login = req.body.login;
        const mdp = req.body.mdp;
        const nom = req.body.nom;
        const prenom = req.body.prenom;
        const mail = req.body.mail;

        const hash = await bcrypt.hashSync(mdp, numberOfRounds);

        await user.insertOne({login:login,mdp:hash,nom:nom,prenom:prenom,mail:mail});
        const doc = await user.find({login:login}).toArray();
        res.status(200).json(doc);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//change le mot de passe pour un utilisateur donné
app.patch('/users/changePass/:login', async (req,res) => {
    try{
        const login = req.params.login;
        const mdp = req.body.mdp;

        const hash = await bcrypt.hashSync(mdp,numberOfRounds);
        
        await user.updateOne({login:login}, {$set:{mdp:hash}});
        doc = await user.find({login:login}).toArray();
        res.status(200).json(doc);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});



/* PROTECT */



//renvoi tous les documents de protect
app.get('/protect', async (req,res) => {
    try{
        const docs = await protect.find().toArray();
        res.status(200).json(docs);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//donne tous les documents ou ce login est protegé
app.get('/protect/protege/:login', async (req,res) => {
    try{
        const login = req.params.login;
        const docs = await protect.find({login_protege:login}).toArray();
        res.status(200).json(docs);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//donne tous les documents ou ce login est protecteur
app.get('/protect/protecteur/:login', async (req,res) => {
    try{
        const login = req.params.login;
        const docs = await protect.find({login_protecteur:login}).toArray();
        res.status(200).json(docs);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//ajoute un document dans protect
app.post('/protect', async (req,res) => {
    try{
        const login_protecteur = req.body.login_protecteur;
        const login_protege = req.body.login_protege;
        await protect.insertOne({login_protecteur:login_protecteur,login_protege:login_protege});
        const doc = await protect.find({login_protecteur:login_protecteur,login_protege:login_protege}).toArray();
        res.status(200).json(doc);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});

//suprimme un document pour un login protege et un login protecteur donnés
app.delete('/protect/:login_protecteur/:login_protege', async (req,res) => {
    try{
        const login_protecteur = req.params.login_protecteur;
        const login_protege = req.params.login_protege;
        await protect.deleteOne({login_protecteur:login_protecteur,login_protege:login_protege});
        const docs = await protect.find().toArray();
        res.status(200).json(docs);
    }
    catch(err){
        console.log(err);
        throw err;
    }
});


/* SOKECT IO */

let i = 1;

io.on('connection', (socket) => {
    console.log('new connection');
    console.log(socket.id);
    console.log('username : '+i);
    socket.username = i;
    i++;

    socket.emit('welcome','Hello');

    socket.on('disconnect', () => {
        console.log('disconnected '+socket.id);
    });

    socket.on('teste', ()=>{
        console.log('teste');
    });

    socket.on('watchPosition',(longitude, latitude)=>{
        console.log('watch - '+socket.id+' : '+socket.username+' - '+longitude+' '+latitude)
        io.emit('getPosition',socket.username,longitude,latitude);
    });
});





/*     LISTENING      */

/*app.listen(8080, () => {
    console.log('listening 8080');
});*/

server.listen(3000, () => {
    console.log('listening 3000')
});
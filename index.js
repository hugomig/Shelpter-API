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

const mongo = require('mongodb');
const ObjectId = mongo.ObjectID;
const MongoClient = mongo.MongoClient;
const url = 'mongodb://mongo:27017';
const dbName = 'SHELPTER';
let db;
let user;
let protect;
let alerts;

const Grid = require('gridfs-stream');
let gfs;

MongoClient.connect(url,{ useUnifiedTopology: true }, (err,client) => {
    console.log('connected to the db');
    db = client.db(dbName);
    user = db.collection('user');
    protect = db.collection('protect');
    alerts = db.collection('alerts');

    gfs = Grid(db,mongo);
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
            res.send(false)
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

        const fileId = req.body.fileId;
        const filePhoto = req.body.filePhoto;

        await user.insertOne({
            login: login,
            mdp: hash,
            nom: nom,
            prenom: prenom,
            mail: mail,
            fileId: fileId,
            filePhoto: filePhoto,
            valid: false
        });
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

app.get('/alerts', async (req,res) => {
    try{
        const rep = await alerts.find().toArray();
        res.status(200).json(rep);
    }
    catch(err){
        throw err;
    }
});

//lorque un utilisateur declenche une alerte
app.post('/alerts', async (req,res) => {
    try{
        const user = req.body.user;
        const message = req.body.message;
        const lat = req.body.lat;
        const long = req.body.long;
        const status = 1;
        const date = Date.now();

        await alerts.insertOne({user: user, message: message, lat: lat, long: long, status: status, date: date});
        const response = alerts.find({login: user, date: date}).toArray();
        res.status(200).json(response);
    }
    catch(err){
        throw err;
    }
});

/*app.delete('/alerts',async (req,res)=>{
    try{
        alerts.remove({});
        const doc = alerts.find().toArray();
        res.status(200).json(doc);
    }
    catch(err){
        throw err;
    }
});*/



/* FILES */

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const storage = new GridFsStorage({
    url: url+'/'+dbName
})
const upload = multer({ storage })


app.post('/files/id', upload.single('id'),async (req,res) => {
    res.status(200).send(req.file.id)
});

app.post('/files/photo', upload.single('photo'),async (req,res) => {
    res.status(200).send(req.file.id)
});

app.post('/files/profile_photo', upload.single('profile_photo'), async (req,res) => {
    res.status(200).send(req.file.id)
})

app.patch('/users/:login/photo', async (req,res) => {
    const login = req.params.login;
    const photoId = req.body.photoId;

    await user.updateOne({login:login}, {$set:{profile_photo: photoId}});
    res.status(200).send(await user.find({login:login}).toArray());
})

app.get('/files/:id', async (req,res) => {
    var id;
    try{
        id = ObjectId(req.params.id)
    }
    catch(err){
        res.status(200).send("bad id");
    }
    const exist = await db.collection('fs.files').find({_id: id}).toArray();
    if(exist.length === 1){
        const readStream = gfs.createReadStream({
            _id: req.params.id
        });
        readStream.pipe(res);
    }
    else{
        res.status(200).send("this file doesnt exist");
    }
});

app.patch('/users/valid/:login', async (req,res) => {
    const login = req.params.login;
    const valid = req.body.valid;

    await user.updateOne({login:login}, {$set:{valid:valid}});

    doc = await user.find({login:login}).toArray();
    res.status(200).json(doc);
})

app.patch('/alerts/:alertId', async (req,res) => {
    const alertId = req.params.alertId;
    const status = req.body.status;

    await alerts.updateOne({_id: ObjectId(alertId)}, {$set:{status: status}});
    res.status(200).send(await alerts.find({_id: ObjectId(alertId)}).toArray());
})



/*   -----------------

        SOKECT IO

     -----------------     */

let i = 1;

io.on('connection', (socket) => {
    console.log('new connection');
    console.log(socket.id);
    console.log('socket : '+i);
    socket.count = i;
    i++;

    socket.emit('welcome','Hello');

    socket.on('login', (login) => {
        console.log(login+' logged');
        socket.login = login;
    });

    socket.on('disconnect', () => {
        console.log('disconnected '+socket.id);
    });

    socket.on('watchPosition',(longitude, latitude)=>{
        console.log('watch - '+socket.id+' : '+socket.username+' - '+longitude+' '+latitude)
        io.emit('getPosition',socket.login,longitude,latitude);
    });

    socket.on('sendPos',(latitude,longitude)=>{
        console.log(socket.id+' : '+latitude+' '+longitude);
        socket.broadcast.emit('receivePos',socket.count,socket.login,latitude,longitude);
    });
});




/* database suppresion shell script */

const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

app.get('/database/reload', async (req,res) => {
    try{
        await ssh.connect({ host: '75.119.135.42', username: 'root', password: 'CX7TacSC5kRe2fr'});
        await ssh.execCommand('cd /home/Shelpter-API && docker-compose down');
        await ssh.execCommand('rm /home/Shelpter-API/data -r');
        await ssh.execCommand('cp /home/Shelpter-API/data_backup /home/Shelpter-API/data -r');
        await ssh.execCommand('cd /home/Shelpter-API && docker-compose up', {
            onStdout: (out) => {
                if(String(out).includes(`"$date"`)){
                    res.status(200).send(String(out))
                }
            }
        });
        res.status(200).send('reloaded');
        ssh.dispose();
    }
    catch(err){
        console.error(err);
        console.log('failed to connect');
        res.status(400)
    }
})

app.get('/database/reload/:reloadId', async (req,res) => {
    const reloadId = req.params.reloadId;
    try{
        await ssh.connect({ host: '75.119.135.42', username: 'root', password: 'CX7TacSC5kRe2fr'});
        await ssh.execCommand('cd /home/Shelpter-API && docker-compose down');
        await ssh.execCommand('rm /home/Shelpter-API/data -r');
        await ssh.execCommand('cp /home/Shelpter-API/backups/backup_'+reloadId+' /home/Shelpter-API/data -r');
        await ssh.execCommand('cd /home/Shelpter-API && docker-compose up', {
            onStdout: (out) => {
                if(String(out).includes(`"$date"`)){
                    res.status(200).send(String(out))
                }
            }
        });
        res.status(200).send('reloaded');
        ssh.dispose();
    }
    catch(err){
        console.error(err);
        console.log('failed to connect');
        res.status(400)
    }
})

app.get('/database/save', async (req,res) => {
    try{
        await ssh.connect({ host: '75.119.135.42', username: 'root', password: 'CX7TacSC5kRe2fr'});
        const result = await ssh.execCommand('cd /home/Shelpter-API && ./save_database.sh');
        res.status(200).send(result.stdout);
        ssh.dispose();
    }
    catch(err){
        console.error(err);
        console.log('failed to connect');
        res.status(400)
    }
})




/*     LISTENING      */

/*app.listen(8080, () => {
    console.log('listening 8080');
});*/

server.listen(3000, () => {
    console.log('listening 3000')
});
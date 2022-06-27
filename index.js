import express, { request } from 'express'
import cors from 'cors'
import joi from "joi"
import chalk from 'chalk';
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from 'mongodb';
import { authSchema, messageBodySchema } from './schema.js';
// import dotenv from 'dotenv';
// dotenv.config();



const app = express()
app.use(cors())
app.use(express.json())

// conectando ao banco
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db = null;

mongoClient.connect().then(() => {
	db = mongoClient.db("batepapo_uol");
    console.log( chalk.bold.red ('Conectado ao MongoDB'))
});

mongoClient.connect().catch((err) => {	
    console.log( chalk.bold.red ('Erro ao conectar ao MongoDB', err))
});



//PARTICIPANTES
app.post("/participants", async (req, res) => {
    let { name } = req.body

    const loginValidation = authSchema.validate(req.body, { abortEarly: false });
    if (loginValidation.hasOwnProperty('error')) {
        res.status(422).send(
            loginValidation.error.details.map((detail) => detail.message)
        );
    } else {
        try {
            const requisicao = await db.collection('participantes').findOne({ name });
            if (requisicao) {
                res.status(409).send('Usuário já existente');
            } else {
                await db.collection('participantes').insertOne(
                {
                    name,
                    lastStatus: Date.now(),
                });
                await db.collection('messages').insertOne({
                    from: name,
                    to: 'Todos',
                    text: 'entra na sala...',
                    type: 'status',
                    time: dayjs().format('HH:mm:ss'),
                });
                res.status(201).send({ name });
            }
        } catch (err) {
            console.log('Request error: ', err);
        }
    }
    
})

app.get("/participants", async (req, res) => { 
    const {user} = req.headers

    if (user){
        try{
            const participantes = await db.collection("participantes").find({ name: { $ne: user } }).toArray()
                console.log(participantes)
                res.send(participantes)            
        } catch (err){
            res.status(500).send({ error: err.message })
        }
    } else {
        res.status(401).send({ error: 'Não Autorizado' })
    }   
})


//MENSAGEM
app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body.user
    const { user } = req.headers;

    const bodyValidation = messageBodySchema.validate(req.body, {abortEarly: false});

    const headerValidation = await db.collection('participantes').findOne({ name: user });

    if (bodyValidation.hasOwnProperty('error') || !headerValidation) {
        if (bodyValidation.error) {
            res.status(422).send(
                bodyValidation.error.details.map((detail) => detail.message)
            );
        } else {
            res.sendStatus(422);
        }
    } else {
        try {
            const message = await db.collection('messages').insertOne({
                from: user,
                to: to,
                text: text,
                type: type,
                time: dayjs().format('HH:mm:ss'),
            });
         
            res.sendStatus(201);
        } catch (err) {
            console.log(err);
        }    }    
})


app.get('/messages', async (req, res) => {
    try {
        const { limit } = req.query;
        const { user } = req.headers;
        if (limit) {
            const requisicao = await db.collection('messages').find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }, { type: 'message' }] }).toArray();
            let messages = [...requisicao].reverse().slice(0, limit);
            res.send(messages.reverse());
        } else {
            const requisicao = await db.collection('messages').find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }] }).toArray();
            let messages = [...requisicao];
            res.send(messages);
        }
    } catch (error) {
        console.log(error);
    }
});


app.post('/status', async (req, res) => {
    const { user } = req.headers;
    try {
        const userVerification = await db.collection('participantes').findOne({ name: user });
        if (userVerification) {
            await db.collection('participantes').updateOne(
                    { name: user },
                    { $set: { lastStatus: Date.now() } }
                );
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.log(err);
    }
});



app.listen(5000)





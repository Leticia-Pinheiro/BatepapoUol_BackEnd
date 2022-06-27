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











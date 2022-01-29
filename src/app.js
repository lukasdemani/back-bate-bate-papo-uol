import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

let db;
mongoClient.connect(() => {
  db = mongoClient.db('batepapouol');
});


const app = express();
app.use(express.json());
app.use(cors());

const participantSchema = joi.object({
  name: joi.string().required()
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid('message','private_message').required()
});


app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/participants', async (req, res) => {
    const participant = {name: req.body.name , lastStatus: Date.now()};

    const message = {
      from: req.body.name,
      to: 'Todos' , 
      text: 'entra na sala...',
      type: 'status',
      lastStatus: dayjs().format('hh:mm:ss')
    };

    const validation = participantSchema.validate(req.body, { abortEarly: true });

    if (validation.error) {
      res.status(422);
      return
    }

  try {
    await db.collection('participants').insertOne(participant)
    await db.collection('messages').insertOne(message)
    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/messages', async (req, res) => {
  const limit = parseInt(req.query.limit);

  try {
    let messages = await db.collection('messages').find().toArray();
    if (messages.length>=limit) {
      let filterMessages = [];
      for (let i = messages.length-limit; i<messages.length; i++){
        filterMessages.push(messages[i]);
      }
      messages=filterMessages;
    }
    res.send(messages);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/messages', async (req, res) => {
  const message = {
    from: req.header('User'),
    to: req.body.to , 
    text: req.body.text,
    type: req.body.type,
    lastStatus: dayjs().format('hh:mm:ss')
  };

  const validation = messageSchema.validate(req.body, { abortEarly: true });

  if (validation.error) {
    res.status(422);
    return
  }

try {
  await db.collection('messages').insertOne(message)
  res.sendStatus(201);
} catch (error) {
  console.error(error);
  res.sendStatus(500);
}
});

app.post('/status', async (req, res) => {
  const user = req.header('User');
  let isLogged = false;

  try {
    const participants = await db.collection('participants').find().toArray();
    for (let i=0; i<participants.length; i++){
      if (participants[i].name==user){
        participants[i].lastStatus = Date.now();
        isLogged = true;
        return
      }
    }

    if (!isLogged){
      res.sendStatus(404);
    }else{
      res.sendStatus(200);
    }

  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
  });

  setInterval(async(req,res) => {

    function message({ name }) {
      const message = {
        from: name,
        to: 'Todos' , 
        text: 'sai da sala...',
        type: 'status',
        lastStatus: dayjs().format('hh:mm:ss')
      };

      return message
    };

    try {
      let participants = await db.collection('participants').find().toArray();
      for (let i=0; i<participants.length;i++){
        if(Date.now()-participants[i].lastStatus>10000){
          participants.splice(i,1);
  
          await db.collection('messages').insertOne(message(participants[i]))
        }
      }
      await db.collection('participants').insertMany(participants);
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.sendStatus(500)
    }  
  }, 15000);

  app.listen(5000, () => {
      console.log('Running on http://localhost:5000')
});
  
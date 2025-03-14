import 'dotenv/config';
import Groq from 'groq-sdk';
import express from 'express';
import {chatOrder, confirmOrder} from './controller.js'
import cors from 'cors';
import { items } from './items.js';


const app = express();
const PORT = 8000;

app.use(express.json());
app.use(cors());
app.use('/assets/images', express.static('assets/images'));
app.listen(PORT, ()=>{
  console.log(`Server started at port ${PORT} .`);
});
app.post('/api/confirm',confirmOrder);
app.post('/api/order',chatOrder);
app.get('/',(req,res)=> {
  res.send('Server is rujnnig')
})
app.get('/api/items',items)
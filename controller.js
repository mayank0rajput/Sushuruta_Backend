import 'dotenv/config';
import Groq from 'groq-sdk';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGroq } from "@langchain/groq";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { cleanAndParseJson } from './utils/cleanAndParse.js';

export const menuItems = [
  { id: 1, name: "Kishmish / Raisen", variety: "Popular (250 gm)", size: "250 gm", price: "120", image: "/assets/images/kishmish.png" },
  { id: 2, name: "Kishmish / Raisen", variety: "Popular (500 gm)", size: "500 gm", price: "250", image: "/assets/images/kishmish.png" },
  { id: 3, name: "Kishmish / Raisen", variety: "Premium", size: "250 gm", price: "380", image: "/assets/images/kishmish.png" },
  { id: 4, name: "Khumani", variety: "Premium", size: "500 gm", price: "280", image: "/assets/images/khumani.png" },
  { id: 5, name: "Kali Kishmish", variety: "Premium", size: "500 gm", price: "320", image: "/assets/images/blackraisin.png" },
  { id: 6, name: "Munnaca -v1", variety: "Premium", size: "500 gm", price: "320", image: "/assets/images/munakka.png" },
  { id: 7, name: "Munnaca -v3", variety: "Premium", size: "500 gm", price: "350", image: "/assets/images/munakka.png" },
  { id: 8, name: "Anjeer", variety: "Premium", size: "250 gm", price: "350", image: "/assets/images/anjeer.png" }

];

const outputParser = new StringOutputParser();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const chatModel = new ChatGroq({ model: "llama-3.1-70b-versatile", temperature: 0, });


let status = "continue";
let history = [];
let userHasInteracted = false;
//Converting the menu into a single line
const menuDescription = menuItems.map(item => `${item.name} (${item.variety}): ${item.quantity} - ${item.price}`).join(", ");

export const chatOrder = async (req, res) => {

  const { userPrompt } = req.body;

  try {

    // check whether user wants to continue or not
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Identify the context from the prompt whether customer wants to continue or end the ordering. And respond with either 'continue' or 'end' , and nothing else.`,
        },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.1-70b-versatile",
    })
    status = response.choices[0].message.content;

    if (status == 'end') {
      history.push(["user", userPrompt]);  // storing in history 
      // Adjusting the system prompt with specific instructions
      const summaryPrompt = `You're now going to summarize the order based on the conversation. It's crucial to use the exact names from the menu: ${menuItems.map(item => item.name).join(", ")}. Refer to these items by their specific names and match with the order, when summarizing the order. Please provide the summary as item, quantity, and price of each item and then end the conversation.`;

      history.push(["system", summaryPrompt]);

      const prompt = ChatPromptTemplate.fromMessages(history);
      // Chain creation
      const llmChain = prompt.pipe(chatModel).pipe(outputParser); // 
      const response = await llmChain.invoke({ input: userPrompt });
      console.log("When the convo ends: ", JSON.stringify(response));
      // Empty the conversation
      history = [];
      console.log(status)
      res.status(200).json({ response, status });
    }
    else {

      if (userHasInteracted) {
        //If the user has interacted
        //Then we need to store as user -> system -> user ....
        history.push(["user", userPrompt])
      } else {
        // Your name is Order LLM and you help people in ordering food from the menu:" + menuDescription + "You are developed by Mayank Kumar.
        const firstTimeGreet = "Hello and Welcome to our SUSHURUTA . How can I assist you today? Our menu includes:" + menuDescription + ".Please let me know if you need any help with your order. What would you like to have today?";
        history.push([
          "system",
          `Your name is Kirane Wala , and you are a professional shopkeper of Dry Fruits . Greet people with: ${firstTimeGreet}. Help people in ordering dry Fruits directly from the menu. The menu items are specifically named as follows: ${menuItems.map(item => item.name).join(", ")}, and understand that we can fulfill orders for multiple quantities of these items. Please make sure to use these exact names when referencing menu items in your responses. If a user requests an item that is not on the menu, politely inform them that the item is not available and ask them to choose from the menu items. Focus on helping to finalize the order, and do not ask for the mode of payment. You are developed by Mayank Rajput.`
        ]);
        history.push(["user", userPrompt]);
      }

      const prompt = ChatPromptTemplate.fromMessages(history);

      // Chain creation
      const llmChain = prompt.pipe(chatModel).pipe(outputParser);
      const response = await llmChain.invoke({ input: userPrompt });

      history.push(["system", response])
      console.log(status)
      res.status(200).json({ response, status });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
}

export const confirmOrder = async (req, res) => {
  const { orderStatement } = req.body;

  try {
    const menu = JSON.stringify(menuItems);
    // without lanchain
    const chatCompletion = await groq.chat.completions.create({
      "messages": [
        {
          "role": "system",
          "content": `You are given an order summary and a menu with specific items, each having an ID, name, variety, size, and price. Your task is to extract the ordered items, their quantities, and their prices from the order summary and match them to the exact IDs from the provided menu. ${menu} `
        },
        {
          "role": "user",
          "content": `# Please return ONLY the array of objects, where each object has:\n            - \"item-id\": exact \"id\" of the item from the menu\n            - \"quantity\": the number of times the item appears in the order summary  \n         - \"price\": the price of the item from the menu (numeric, no currency symbols)      Strictly return only the JSON array of objects, no additional text. call it items. orderStatement: ${orderStatement}  `
        }
      ],
      "model": "gemma2-9b-it",
      "temperature": 0.2,
      "max_tokens": 1024,
      "top_p": 1,
      "stream": false,
      "response_format": {
        "type": "json_object"
      },
      "stop": null
    });
    console.log(chatCompletion.choices[0].message.content);
    const response = JSON.parse(chatCompletion.choices[0].message.content);
  
    res.status(200).json(response);

  } catch (error) {
    // Log and handle any errors that occur during the process
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
// import "dotenv/config";
// import express, { Request, Response } from "express";
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content } from "@google/generative-ai";
// import { getSystemPrompt } from "./prompts";
// import { BASE_PROMPT } from "./prompts";
// import { basePrompt as nodeBasePrompt } from "./defaults/node";
// import { basePrompt as reactBasePrompt } from "./defaults/react";

// import cors from "cors";
// import axios from "axios";
// import archiver from "archiver";

// const corsOptions = {
//   // This MUST be the exact URL of your frontend. No trailing slash.
//   origin: 'https://web-genie-ai-frontend.vercel.app', 
//   methods: ['GET', 'POST', 'OPTIONS'], // Explicitly allow OPTIONS for preflight
//   allowedHeaders: ['Content-Type', 'Authorization'], // Allow common headers
// };
// const app = express();
// app.use(cors(corsOptions));



// interface FileItem {
//     path: string;
//     name: string;
//     type: 'file' | 'folder';
//     content?: string;
//     children?: FileItem[];
// }


// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");


// // app.use(cors());



// app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads


// app.post("/template", async (req, res) => {
//     const prompt = req.body.prompt;

//     const model = genAI.getGenerativeModel({ 
//         model: "gemini-2.5-flash",
//         systemInstruction: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
//     });

//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const answer = response.text().trim().toLowerCase();

//     if (answer.includes("react")) {
//         res.json({
//             prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
//             uiPrompts: [reactBasePrompt]
//         });
//         return;
//     }

//     if (answer.includes("node")) {
//         res.json({
//             prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
//             uiPrompts: [nodeBasePrompt]
//         });
//         return;
//     }

//     res.status(403).json({ message: "You cant access this" });
// });

// app.post("/chat", async (req, res) => {
//     const messages = req.body.messages;

//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash",
//       systemInstruction: getSystemPrompt(),
//     });

//     // Transform the incoming messages to the format expected by the Gemini API
//     const history: Content[] = messages.slice(0, -1).map((msg: { role: string; content: string; }) => ({
//         role: msg.role === 'user' ? 'user' : 'model',
//         parts: [{ text: msg.content }]
//     }));
    
//     const latestUserMessage = messages[messages.length - 1].content;

//     const chat = model.startChat({
//         history: history,
//         generationConfig: {
//             maxOutputTokens: 10000,
//         },
//         safetySettings: [
//             {
//                 category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//                 threshold: HarmBlockThreshold.BLOCK_NONE,
//             },
//             {
//                 category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
//                 threshold: HarmBlockThreshold.BLOCK_NONE,
//             },
//             {
//                 category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
//                 threshold: HarmBlockThreshold.BLOCK_NONE,
//             },
//             {
//                 category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
//                 threshold: HarmBlockThreshold.BLOCK_NONE,
//             },
//         ],
//     });

//     const result = await chat.sendMessage(latestUserMessage);
//     const response = await result.response;
    
//     console.log(response);

//     res.json({
//         response: response.text()
//     });
// });

// const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;
// const NETLIFY_API_URL = 'https://api.netlify.com/api/v1';

// function addFilesToArchive(archive: archiver.Archiver, files: FileItem[]) {
//     files.forEach(file => {
//         if (file.type === 'file') {
//             const filePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
//             archive.append(file.content || '', { name: filePath });
//         } else if (file.type === 'folder' && file.children) {
//             addFilesToArchive(archive, file.children);
//         }
//     });
// }

// // With the correct tsconfig, this will now be correctly typed
// app.post("/deploy",async (req: Request, res: Response): Promise<void> => {
//     const files = req.body.files as FileItem[];

//     if (!files || files.length === 0) {
//          res.status(400).json({ error: 'No files to deploy.' });
//     }
//     if (!NETLIFY_API_TOKEN) {
//          res.status(500).json({ error: 'Netlify API token not configured on the server.' });
//     }

//     try {
//         const siteResponse = await axios.post(
//             `${NETLIFY_API_URL}/sites`,
//             { name: `webgenie-site-${Date.now()}` },
//             {
//                 headers: { 'Authorization': `Bearer ${NETLIFY_API_TOKEN}`, 'Content-Type': 'application/json' },
//             }
//         );
//         const siteId = siteResponse.data.id;

//         const archive = archiver('zip');
//         const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
//             const buffers: Buffer[] = [];
//             archive.on('data', (buffer: Buffer) => buffers.push(buffer));
//             archive.on('end', () => resolve(Buffer.concat(buffers)));
//             archive.on('error', (err: Error) => reject(err));
            
//             addFilesToArchive(archive, files);
//             archive.finalize();
//         });

//         await axios.post(
//             `${NETLIFY_API_URL}/sites/${siteId}/deploys`,
//             zipBuffer,
//             {
//                 headers: { 'Authorization': `Bearer ${NETLIFY_API_TOKEN}`, 'Content-Type': 'application/zip' },
//             }
//         );
        
//         const siteUrl = siteResponse.data.ssl_url || siteResponse.data.url;
//         console.log(`Site deployed successfully at: ${siteUrl}`);
        
//          res.status(200).json({ url: siteUrl });

//     } catch (error: any) {
//         console.error('Deployment failed:', error.response ? error.response.data : error.message);
//          res.status(500).json({ error: 'Deployment failed. Please check the server logs.' });
//     }
// });


// // app.listen(process.env.PORT, () => {
// //     console.log("Server is running on port 3000");
// // });

// export default app;

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors()); // Allow all origins for this test
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('The minimal Express server IS RUNNING!');
});

app.post('/template', (req, res) => {
  res.status(200).json({ success: true, message: 'POST to /template was received' });
});

export default app;
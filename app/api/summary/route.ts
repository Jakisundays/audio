import { RetrievalQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { PromptTemplate } from "langchain";
import { OpenAI } from "langchain/llms/openai";

// 3/10
// const template = `
// ## Study Summary Template

// ### Distillation Guidelines:
// Distill the provided university class transcription into a streamlined and well-organized summary, focusing on vital information for effective studying. Retain key concepts, essential examples, and important explanations while removing redundancies and minor details. The objective is to craft a concise and impactful summary that enhances studying without omitting crucial details.

// ### Class Transcription:
// {context}

// ### Annotations:
// Incorporate any notices, reminders, or recommendations from the class into this dedicated section.

// ### Helpful Summary:
// `;

// 6/10
// const template = `Use the following pieces of context containing the transcription of a university class to generate a more concise and organized version that retains crucial information for studying. Keep key concepts, relevant examples, and important explanations. Eliminate repetitions and minor details. The goal is to create an effective summary that facilitates studying without losing essential information.
// {context}
// Extract any notices, reminders, or recommendations provided in the class into a section called annotations.
// Helpful Answer:`;

const template = `
Distill the provided university class transcription into a streamlined and well-organized summary in the same language as the context, focusing on vital information for effective studying. Retain key concepts, essential examples, and important explanations while removing redundancies and minor details. The objective is to craft a concise and impactful summary that enhances studying without omitting crucial details.
{context}

Incorporate any notices, reminders, or recommendations from the class into a dedicated "Annotations" section.

Useful Summary in markDown format:
`;

// 'ChatGPT, developed by OpenAI, is a remarkable AI model that has revolutionized human-machine interactions by leveraging natural language processing. It is part of the GPT family, based on the Transformer neural network architecture, allowing the machine to understand and generate text in a surprisingly human-like way. Through training on a wide range of texts, ChatGPT can answer questions, complete sentences, and hold coherent conversations.\n' +
//     '\n' +
//     'One of the most impressive features of ChatGPT is its adaptability to various tasks and contexts. It can function as a virtual assistant, providing weather information, scheduling reminders, or even assisting in creative writing. It has also proven to be a useful tool in education, explaining complex concepts in a understandable manner.\n' +
//     '\n' +
//     'However, it is important to note that ChatGPT does have limitations. It can sometimes generate nonsensical or incorrect responses and can be sensitive to the formulation of questions. Like any AI technology, it should be used responsibly and ethically.\n' +
//     '\n' +
//     "Developers have been experimenting with ChatGPT, integrating it into applications, websites, and systems to enhance user experiences. Through APIs and libraries, programmers can access ChatGPT's capabilities and customize its behavior to meet specific project needs.\n" +
//     '\n' +
//     'In summary, ChatGPT has transformed the way we interact with artificial intelligence. Its ability to understand natural language and generate coherent responses has opened new possibilities in customer service, AI-assisted education, and virtual assistance. As advancements in this field continue, it is exciting to think about how ChatGPT and similar technologies will continue enriching our lives.\n' +
//     '\n' +
//     'Annotations:\n' +
//     '- ChatGPT is based on the GPT family, which uses the Transformer neural network architecture.\n' +
//     '- ChatGPT can adapt to a wide range of tasks and contexts, serving as a virtual assistant or assisting in educational settings.\n' +
//     '- However, ChatGPT has limitations, such as occasional nonsensical or incorrect responses and sensitivity to question formulation.\n' +
//     '- Developers can integrate ChatGPT into applications, websites, and systems using APIs and libraries.'

// OG
// const template = `Use the following pieces of context to answer the question at the end.
// If you don't know the answer, just say that you don't know, don't try to make up an answer.
// {context}
// Question: {question}
// Helpful Answer:`;

// Given the following text containing the transcription of a university class, please generate a more concise and organized version that retains crucial information for studying. Keep key concepts, relevant examples, and important explanations. Eliminate repetitions and minor details. The goal is to create an effective summary that facilitates studying without losing essential information. Also, extract any notices, reminders, or recommendations provided in the class into a section called annotations.

const privateKey = process.env.SUPABASE_PRIVATE_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);

// console.log(informacionChatGPT);

export const POST = async (request: Request) => {
  console.log("iniciando");
  const text = await request.json();

  const client = createClient(url, privateKey, {
    auth: { persistSession: false },
  });

  const model = new OpenAI({
    modelName: "gpt-3.5-turbo",
    // openAIApiKey: process.env.NEXT_OPENAI_API_KEY,
  });
  const doc = new Document({ pageContent: text });

  try {
    const vectorStore = await SupabaseVectorStore.fromDocuments(
      [doc],
      new OpenAIEmbeddings(),
      {
        client,
        tableName: "documents",
        queryName: "match_documents",
      }
    );

    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
      prompt: PromptTemplate.fromTemplate(template),
    });

    // const response = await chain.call({
    //   query: "crea 10 preguntas sobre el texto",
    // });
    const response = await chain.run(
      "Create a streamlined summary of the university class transcription, highlighting crucial study information. Keep key concepts, examples, and explanations while removing redundancies and minor details. Craft a concise, impactful summary that enhances studying without omitting essentials."
    );

    console.log(response);

    return new Response(JSON.stringify(response));
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify(error));
  }
};

/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

import { logger, onInit } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { TextInput, defineInt, defineSecret, defineString } from "firebase-functions/params";

// use the firebase admin SDK to access firestore
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// global app initialization
initializeApp();

// parameterization
// function config:
const minInstancesConfig = defineInt('HELLO_WORLD_MININSTANCES', {
  default: 0,
  label: 'Min Instances',
  description: 'Minimum number of instances for this function',
  input: {
    text: {
      example: '5',
      validationRegex: '^[0-9]*$',
      validationErrorMessage: 'Must be a number',
    }
  } as TextInput<number>,
});
// runtime value:
const welcomeMessage = defineString('WELCOME_MESSAGE');
// sensitive value:
// Will be looked up in the Secret Manager API or asked for on deploy.
// For testing (in the emulator) we can use a .secret.local file with dummy values
// although there is an issue open: https://github.com/firebase/firebase-tools/issues/5520
// Workaround is to add an empty entry to .env.local for the secret.
const apiKey = defineSecret('API_KEY');

// using a parameter to initialize a global value in onInit callback
onInit(() => {
  logger.log(`Could initialize an api client globally with key ${apiKey.value()}.`);
})

// Take the text parameter passed to this HTTP endpoint and insert it into
// Firestore under the path /messages/:documentId/original
export const addmessage = onCall<{ text: string }, Promise<{ result: string }>>({
  preserveExternalChanges: false, // whether to merge these options with the settings of the currently-deployed version
  concurrency: 80, // 1 - 1000; concurrent requests per instance; think about RAM
  minInstances: minInstancesConfig, // Keep 0 instances warm for "this latency-critical function"
  maxInstances: 10, // 10 max instances with a concurrency of 80 can handle 800 requests simultaneously
  timeoutSeconds: 300, // max 540
  memory: "128MiB",
  cpu: 1, // scales with memory, if not set explicitly
  secrets: [apiKey], // bind secret to function
}, async (req) => {

  // use function parameter
  logger.log(`Welcome message: ${welcomeMessage.value()}`);
  // use sensitive parameter
  logger.log(`Could initialize an api client locally with key ${apiKey.value()}.`);

  // Grab the text parameter.
  const original = req.data.text;
  // const original = req.rawRequest.query.text;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = await getFirestore()
    .collection("messages")
    .add({ original: original });
  // Send back a message that we've successfully written the message
  return { result: `Message with ID: ${writeResult.id} added.` };
});

// Listens for new messages added to /messages/:documentId/original
// and saves an uppercased version of the message
// to /messages/:documentId/uppercase
export const makeuppercase = onDocumentCreated("/messages/{documentId}", (event) => {
  // Grab the current value of what was written to Firestore.
  const original = event.data?.data().original as string | undefined;
  if (!original) {
    logger.log("Event without data for document:", event.document);
    return;
  }

  // Access the parameter `{documentId}` with `event.params`
  logger.log("Uppercasing", event.params.documentId, original);

  const uppercase = original.toUpperCase();

  // You must return a Promise when performing
  // asynchronous tasks inside a function
  // such as writing to Firestore.
  // Setting an 'uppercase' field in Firestore document returns a Promise.
  return event.data?.ref.set({ uppercase }, { merge: true });
});

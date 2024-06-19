import { expect, jest, test } from "@jest/globals";
import { CallableRequest } from 'firebase-functions/v2/https';
import { logger } from "firebase-functions";

import firebasefunctiontest from 'firebase-functions-test';
const { wrap } = firebasefunctiontest(/* firebaseConfig. Empty for local testing */);
// import everything to be able to spy on the "getFirestore" exported function
import * as firestoreAdmin from "firebase-admin/firestore";
// import functions to test after firebasefunctiontest initialization
import { addmessage } from '../src/index';

test("addmessage", async () => {

    // const firestoreMock: Firestore = {
    //     collection: jest.fn<typeof Firestore.prototype.collection>().mockImplementation(
    //         ((collectionPath: string) => {
    //             if (collectionPath !== "messages") { };
    //             return {
    //                 add: jest.fn().mockReturnValue(Promise.resolve({
    //                     id: "1"
    //                 }) as Promise<DocumentReference<DocumentData, DocumentData>>)
    //             }
    //         }) as unknown as ((collectionPath: string) => CollectionReference<DocumentData, DocumentData>))
    // } as unknown as Firestore;

    // ARRANGE
    const firestoreMock = {
        collection: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnValue(Promise.resolve({
            id: "1"
        }))
    } as unknown as firestoreAdmin.Firestore;
    jest.spyOn(firestoreAdmin, "getFirestore").mockReturnValue(firestoreMock);
    const mockLog = jest.spyOn(logger, "log");

    const wf = wrap(addmessage);
    const mockRequest = {
        data: {
            text: "hello"
        }
    } as CallableRequest<{ text: string }>;

    // ACT
    const response = await wf(mockRequest);

    // ASSERT
    expect(firestoreMock.collection).toBeCalledWith("messages");
    expect(response.result).toBe("Message with ID: 1 added.");
    expect(mockLog).toBeCalledTimes(
        1 // global init
        + 1 // welcome message
        + 1 // local init
    );
});

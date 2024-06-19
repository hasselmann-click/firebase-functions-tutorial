import { addmessage } from '../src/index';

import { expect, test } from "@jest/globals";
import firebasefunctiontest from 'firebase-functions-test';
import { CallableRequest } from 'firebase-functions/v2/https';
const { wrap } = firebasefunctiontest();

test("addmessage", async () => {
    const wf = wrap(addmessage);
    const mockRequest = {
        data: {
            text: "hello"
        }
    } as CallableRequest<{ text: string }>;
    const response = await wf(mockRequest);
    expect(response.result).toBe("Message with ID: 1 added.");
});

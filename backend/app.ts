import express from "express";
import { createClient } from "redis";
import { json } from "body-parser";

const DEFAULT_BALANCE = 100;

interface ChargeResult {
    isAuthorized: boolean;
    remainingBalance: number;
    charges: number;
    statusCode: number;
    responseMessage: string;
}

async function connect(): Promise<ReturnType<typeof createClient>> {
    const url = `redis://${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`;
    console.log(`Using redis URL ${url}`);
    const client = createClient({ url });
    await client.connect();
    return client;
}

async function reset(account: string, balance: number): Promise<void> {
    const client = await connect();
    try {
        await client.set(`${account}/balance`, balance);
    } finally {
        await client.disconnect();
    }
}

async function charge(account: string, charges: number): Promise<ChargeResult> {
    const client = await connect();
    try {
        const balance = parseInt((await client.get(`${account}/balance`)) ?? "");
        if (!charges || isNaN(charges)) {
            return {
                isAuthorized: false,
                remainingBalance: balance,
                charges: 0,
                statusCode: 400,
                responseMessage: `Invalid or missing charge cost`
            };
        }
        if (balance >= charges) {
            await client.set(`${account}/balance`, balance - charges);
            const remainingBalance = parseInt((await client.get(`${account}/balance`)) ?? "");
            return { 
                isAuthorized: true, 
                remainingBalance, 
                charges, 
                statusCode: 200,
                responseMessage: `Successfully charged account ${account}` 
            };
        } else {
            return { 
                isAuthorized: false, 
                remainingBalance: balance, 
                charges: 0, 
                statusCode: 401,
                responseMessage: `Access denied due to insufficient balance: ${balance}`
            };
        }
    } finally {
        await client.disconnect();
    }
}

export function buildApp(): express.Application {
    const app = express();
    app.use(json());
    app.post("/reset", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            const balance = req.body.balance ?? DEFAULT_BALANCE;
            await reset(account, balance);
            console.log(`Successfully reset account ${account}`);
            res.sendStatus(204);
        } catch (e) {
            console.error("Error while resetting account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    app.post("/charge", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            const result = await charge(account, req.body.charges);
            if (result.isAuthorized) {
                console.log(result.responseMessage);
                res.status(result.statusCode).json(result);
            } else {
                console.error(result.responseMessage);
                res.status(result.statusCode).json({ error: result.responseMessage});
            }
        } catch (e) {
            console.error("Error while charging account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    return app;
}

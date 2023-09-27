import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";

const app = supertest(buildApp());

async function basicLatencyTest() {
    console.log('basicLatencyTest Start');
    await app.post("/reset").expect(204);
    const start = performance.now();
    await app.post("/charge").send({ charges: 25}).expect(200);
    await app.post("/charge").send({ charges: 25}).expect(200);
    await app.post("/charge").send({ charges: 25}).expect(200);
    await app.post("/charge").send({ charges: 25}).expect(200);
    console.log('basicLatencyTest End');
    console.log(`Latency: ${performance.now() - start} ms`);
}

async function runTests() {
    await basicLatencyTest();
    await basicBalanceTest();
    await negativeBalanceTest();
}

async function negativeBalanceTest() {
    console.log('negativeBalanceTest Start');
    await app.post("/reset").send({
        account: 'negativeBalanceTest',
        balance: -10}).expect(204);
    const start = performance.now();
    await app.post("/charge").send({ 
        account: 'negativeBalanceTest',charges: 25}).expect(401);
    console.log('negativeBalanceTest End');
    console.log(`Latency: ${performance.now() - start} ms`);
}
async function basicBalanceTest() {  
    console.log('basicBalanceTest Start');
    await app.post("/reset").send({
        account: 'basicBalanceTest',
        balance: 100}).expect(204);
    const start = performance.now();
    await app.post("/charge").send({
        account: 'basicBalanceTest',
        charges: 25
    }).expect(200);
    await app.post("/charge").send({
        account: 'basicBalanceTest',
        charges: 25 }).expect(200);
    await app.post("/charge").send({         
        account: 'basicBalanceTest',
        charges: 25}).expect(200);
    await app.post("/charge").send({     
        account: 'basicBalanceTest',
        charges: 25}).expect(200);
        await app.post("/charge").send({     
            account: 'basicBalanceTest',
            charges: 1}).expect(401);

    console.log('basicBalanceTest End');
    console.log(`Latency: ${performance.now() - start} ms`);
}
runTests().catch(console.error);

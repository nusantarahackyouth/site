import { getRPCServer } from "@/lib/rpc";

export async function getV1Test() {
    try {
        const resp = await getRPCServer().v1.$get();
        return await resp.json();
    } catch (error) {
        return null;
    }
}

export async function getEvents() {
    try {
        const resp = await getRPCServer().v1.events.$get();
        return await resp.json();
    } catch (error) {
        return null;
    }
}

export default {
    getV1Test,
    getEvents,
};
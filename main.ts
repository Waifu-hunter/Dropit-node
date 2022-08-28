/**
 * Permet de:
 * - verifier l'auth de l'user avec sa clé
 * - faire un proxy entre les clients connecté sur ce node
 * - faire un proxy entre les clients connecté sur d'autre node
 */

const PORT = 25793;
const MYID = "node1";
const RESPONSE_ERROR = new Response("418", { status: 418 });

interface Client {
    socket: WebSocket;
    id: string | null;
    userKey: string[];
}

const server = Deno.listen({ hostname: "0.0.0.0", port: PORT });
const clients = new Array<Client>();

import { contat } from "./contact.ts";
const contactAPI = new contat(MYID);

export async function handlerMessage(client: Client, data: any) {

    console.log(client)

    data = JSON.parse(data);
    data.body = JSON.parse(data.body);
    console.log(data)


    if(data.body.route == "/register"){
        // contact the main server to register the user
        const registerData = await contactAPI.send("/register", data.body.body);
        if(data.type == "ask"){
            //respond to the client
            client.socket.send(JSON.stringify({
                type: "reply",
                uid: data.uid,
                body: registerData
            }));
        }
    } else if(data.body.route == "/login"){
        const loginData = await contactAPI.send("/login", data.body.body);
        if(data.type == "ask"){
            //respond to the client
            client.socket.send(JSON.stringify({
                type: "reply",
                uid: data.uid,
                body: loginData
            }));
        }
    } else if(data.body.route == "/loginCheck"){
        const loginCheckData = await contactAPI.send("/loginCheck", data.body.body);
        if(data.type == "ask"){
            if(loginCheckData.sucess){
                client.userKey.push(loginCheckData.userKey);
            }
            //respond to the client
            client.socket.send(JSON.stringify({
                type: "reply",
                uid: data.uid,
                body: loginCheckData
            }));
        }
    } 

    await new Promise(resolve => resolve);

}

export function handlerWebSocket(socket: WebSocket) {
    const client: Client = { socket, id: null, userKey: [] };

    let isAuth = false;

    socket.onopen = () => { 
        clients.push(client);
    };

    socket.onmessage = async (event: MessageEvent) => {
        return await handlerMessage(client, event.data);
    };

    socket.onclose = () => {
        const index = clients.indexOf(client, 0);

        if (isAuth) isAuth = false;

        if (index >= 0) {
            clients.slice(index, 1);
        }
    };
    
    socket.onerror = (err) => {
        console.error(err)
    };
}

export async function handlerConnection(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);

  for await (const { request, respondWith } of httpConn) {
    const url = new URL(request.url).pathname,
        upgrade = request.headers.get("upgrade")?.toLowerCase();

    if (url != "/dropit" || upgrade != "websocket") {
        await respondWith(RESPONSE_ERROR);
        continue;
    }

    const { socket, response } = Deno.upgradeWebSocket(request);
    handlerWebSocket(socket);
    await respondWith(response);
  }
}

for await (const conn of server) {
    handlerConnection(conn);
}
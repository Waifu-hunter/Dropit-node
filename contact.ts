export class contat {
    private id = ""
    private url = "http://127.0.0.1:25790"

    constructor(id: string) {
        this.id = id;
    }

    async send(path:string, body:any) {
        console.log(body)
        try {
            const req = await fetch(this.url + path, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "nodeID": this.id
                },
                body: JSON.stringify(body)
            })
            return await req.json()
        } catch (error) {
            console.log(error)
        }
    }
}
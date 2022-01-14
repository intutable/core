// this should be replaced with logging plugin
export class Logger {
    constructor(private debugging: boolean = false) {}

    public log(...args: any[]) {
        if (this.debugging) {
            console.log(...args)
        }
    }
}

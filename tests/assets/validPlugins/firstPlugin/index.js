module.exports = {
    init: function (plugin) {
        plugin.listenForRequest("firstPlugin").on("greeting", (request, resolve, reject) => {
            resolve({ message: "Hello from the first plugin" })
        })
    },
}

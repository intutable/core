module.exports = {
    init: function (plugin) {
        plugin.listenForRequest("secondPlugin").on("greeting", (request, resolve, reject) => {
            resolve({ message: "Hello from the second plugin" })
        })
    },
}

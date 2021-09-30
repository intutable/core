module.exports = {
    init: function (plugin) {
        plugin.listenForRequest("firstPlugin").on("greeting", request => {
            return Promise.resolve({ message: "Hello from the first plugin" })
        })
    },
}

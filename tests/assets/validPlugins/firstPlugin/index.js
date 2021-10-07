module.exports = {
    init: function (plugin) {
        plugin.listenForRequests("firstPlugin").on("greeting", request => {
            return Promise.resolve({ message: "Hello from the first plugin" })
        })
    },
}

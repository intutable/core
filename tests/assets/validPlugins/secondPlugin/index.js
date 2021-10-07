module.exports = {
    init: function (plugin) {
        plugin.listenForRequests("secondPlugin").on("greeting", request => {
            return Promise.resolve({ message: "Hello from the second plugin" })
        })
    },
}

module.exports = {
    init: function (plugin) {
        plugin.listenForRequest("secondPlugin").on("greeting", request => {
            return Promise.resolve({ message: "Hello from the second plugin" })
        })
    },
}


Parse.Cloud.define("deleteUser", async (request) => {
    if (request.user != null) {
        const user = request.user;
        return user.destroy({ useMasterKey: true});
    }
})
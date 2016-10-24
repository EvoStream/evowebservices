/***
 *
 * EvoStream Web Services
 * EvoStream, Inc.
 * (c) 2016 by EvoStream, Inc. (support@evostream.com)
 * Released under the MIT License
 *
 ***/


module.exports = function syncFor(index, len, status, func) {
    func(index, status, function (res) {
        if (res == "next") {
            index++;
            if (index < len) {
                syncFor(index, len, "r", func);
            } else {
                return func(index, "done", function () {
                })
            }
        }
    });

}
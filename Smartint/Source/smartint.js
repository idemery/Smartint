/**
 * Smartint - A Dropbox Document Management System for Dynamics CRM
 * @class
 * @constructor
 * @author Islam Eldemery
 */
window.dropbox_smartint = function () {

    var self = this,
	/**
	 * Dropbox API version
	 * The current version of our API is version 1.
	 * Most version 0 methods (https://www.dropbox.com/developers/reference/oldapi) will work for the time being,
	 * but some of its methods risk being removed (most notably, the version 0 API methods /token and /account).
	 *
	 * @type {String}
	 */
	_API_VER = "1",
	/**
	 * This is the api url, used for most operations like metadata, delta... etc.
	 *
	 * @type {String}
	 */
	_API_URL = "https://api.dropbox.com/" + _API_VER + "/",
	/**
	 * This is the api-content url, used to download and upload files.
	 *
	 * @type {String}
	 */
	_CNT_URL = "https://api-content.dropbox.com/" + _API_VER + "/",
	/**
	 * This is the www url, used only for the user authorization step.
	 *
	 * @type {String}
	 */
	_WWW_URL = "https://www.dropbox.com/" + _API_VER + "/",
	/**
	 * Smartint home url on Dropbox website
	 *
	 * @type {String}
	 */
	dropboxUrl = "https://www.dropbox.com/home/Apps/MSCRMBOX",
	/**
	 * Represents an Id for the Dropbox volume. Required by elFinder.
	 *
	 * @type {String}
	 */
	volumeId = 'l0_',
	/**
	 * Defines a message with OAuth timestamp and nonce.
	 * And signs the message with the accessor's consumer secret and user's access token.
	 *
	 * @param {String} method	Ajax method type GET or PUT
	 * @param {String} url		Ajax url
	 * @param {Object} data		Any parameters
	 *
	 * @return {Object} 		Returns an object with parameters property that can be used in this way: OAuth.getParameterMap(message.parameters)
	 */
	auth_msg = function (method, url, data, token_data, consumerKey, consumerSecret) {
	    var message = {
	        method: method,
	        action: url,
	        parameters: {
	            /**
                * Smartint APP KEY
                */
	            oauth_consumer_key: consumerKey,//'zsiqyq2krn14xav',
	            oauth_signature_method: "HMAC-SHA1"
	        }
	    };
	    var accessor = {
	        /**
            * Smartint APP SECRET
            */
	        consumerSecret: consumerSecret,//'pea84m8k1mxz4kc'
	    };

	    if (token_data) {

	        var pairs = token_data.split(/&/);
	        var result = {};
	        for (var i in pairs) {
	            var pair = pairs[i].split(/=/, 2);
	            result[pair[0]] = pair[1];
	        }

	        message.parameters.oauth_token = result.oauth_token;
	        accessor.tokenSecret = result.oauth_token_secret;
	    }

	    if (data) {
	        for (var key in data)
	            message.parameters[key] = data[key];
	    }

	    OAuth.setTimestampAndNonce(message);
	    OAuth.SignatureMethod.sign(message, accessor);

	    return message;
	},

	/**
	 * Generates an error response for elFinder.
	 *
	 * @param {Object} jqXHR		The jqXHR object, which is a superset of the XMLHTTPRequest object. http://api.jquery.com/jQuery.ajax/#jqXHR
	 * @param {Object} exception	Exception error
	 *
	 * @return {Object} 			Returns error response
	 */
	getErrorResponse = function (jqXHR, exception) {
	    //console.log("error..");
	    //console.log(jqXHR);
	    //console.log(exception);
	    return $.parseJSON(jqXHR.responseText);
	    // var response = {};
	    // switch (jqXHR.status) {
	    // case 404:
	    // response.error = "This folder or file has been moved, deleted, or does not exist.";
	    // break;
	    // case 403:
	    // console.log(jqXHR);
	    // response.error = jqXHR.responseText.error;
	    // break;
	    // default:
	    // response.error = jqXHR.responseText;
	    // }
	    // return response;
	};

    /**************************************************************************************************************/
    /****************************************** PUBLIC METHODS ****************************************************/

    this.elfinder_options = null;

    /**
	 *  Substring the folder or file name from the path
	 *
	 * @param {String} path		Folder or file path
	 *
	 * @return {String} 		Returns folder or file name
	 */
    this.nameFromPath = function (path) {
        return path.substr(path.lastIndexOf('/') + 1);
    };

    /**
	 * Signs the url with the appropriate OAuth parameters
	 *
	 * @param {String} method	Ajax method type GET or PUT
	 * @param {String} url		Ajax url
	 * @param {Object} data		Any parameters
	 *
	 * @return {String} 		Returns url with the appropriate OAuth parameters
	 */
    this.sign_url = function (method, url, data, token_data) {
        var message = auth_msg(method, url, data, token_data || this.elfinder_options.data.token_data, this.elfinder_options.data.consumerKey, this.elfinder_options.data.consumerSecret);
        var params = OAuth.getParameterMap(message.parameters);
        if (params) {
            var pList = [];
            for (var key in params)
                pList.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
            params = (pList.length > 0) ? pList.join("&").replace(/%20/g, "+") : null;
        }

        url += "?" + params;
        return url;
    };

    /**
	 * Gets the Dropbox upload url in order to be as action like <form action="url"..
     * this method is used as a workaround when XMLHttpRequest cannot be used
	 *
	 * @param {String} method	Current folder (cwd) where to upload to
	 * @param {String} url		The html files input in order to extract the file name
	 *
	 * @return {String} 		Returns url with the appropriate OAuth parameters
	 */
    this.getUploadUrlForIframe = function (parentPath, input) {

        if (!input.files || input.files.length == 0) return null;

        var
        /**
		 * the file to upload
		 */
        file = input.files[0],
        /**
		 * complete file path
		 */
        path = parentPath + '/' + file.name,
        /**
		 * encode the file path in order to support spaces and unicode
		 */
        path = encodeURI(path),
        /**
		 * url to post the file to
		 */
		url = _CNT_URL + 'files_put/sandbox' + path;
        /**
		 * Sign the url
		 */
        url = self.sign_url('PUT', url),
        url += "&callback=?";
        return url;
    };

    /**
	 * Substring the path of the parent folder
	 *
	 * @param {String} path		Folder or file path
	 *
	 * @return {String} 		Returns the path of the parent folder
	 */
    this.getParentPath = function (path) {
        return path.substr(0, path.lastIndexOf('/'));
    };

    /**
	 * Generates hash from the path using base64 encoding, replacing +/= to -_. and removing any trailing dots
	 *
	 * @param {String} path		Folder or file path
	 *
	 * @return {String}			Returns hash of the path
	 */
    this.encryptPath = function (path) {
        path = encodeURI(path); // to support unicode
        return window.base64.encode(path);
    };

    /**
	 * Decrypts the hash back into dropbox path
	 *
	 * @param {String} hash		Folder or file hash
	 *
	 * @return {String} 		Returns the path of the hash
	 */
    this.decryptPath = function (hash) {
        return decodeURI(window.base64.decode(hash));
    };

    /**
	 * This should get dropbox account info
	 *
	 * @return {Object} debug information for elFinder
	 */
    this.getDebug = function () {
        var debug = {
            connector: "js",
            memory: "1344Kb / 1232Kb / 128M",
            mountErrors: [],
            time: 0.079999923706055,
            upload: "",
            volumes: [{
                id: volumeId,
                name: "localfilesystem"
            }]
        };
        return debug;
    };

    /**
	 * Options needed for elFinder
	 *
	 * @param {Object} data		returned data from dropbox (file)
	 *
	 * @return {Object}			returns options object needed for elFinder
	 */
    this.getOptions = function (data) {
        var options = {
            path: data.path,
            url: dropboxUrl + data.path,
            separator: "/",
            disabled: ['extract', 'tmb', 'size', 'dim', 'mkfile', 'duplicate', 'get', 'put', 'archive', 'info', 'resize', 'netmount'],
            copyOverwrite: 1,
            archivers: {
                create: [{
                    0: "application/x-tar"
                }, {
                    1: "application/x-gzip"
                }],
                extract: [{
                    0: "application/x-tar"
                }, {
                    1: "application/x-gzip"
                }]
            }
        };
        return options;
    };

    /**
	 * Converts the metadata returned by dropbox to folder object that elFinder can understand
	 *
	 * @param {Object} 	data		Metadata returned from dropbox
	 * @param {bool}	init		A value that indicates whether the request is init (the first request) or open
	 *
	 * @return {Object}				Returns cwd object for elFinder
	 */
    this.getCwd = function (data, init) {
        var self = this, has_childs = (data.contents && data.contents.length && data.contents.length > 0) ? 1 : 0, cwd = {
            name: init ? 'Dropbox' : this.nameFromPath(data.path),
            hash: self.encryptPath(data.path),

            phash: self.encryptPath(self.getParentPath(data.path)),

            mime: data.is_dir ? "directory" : data.mime_type,
            ts: Math.round(+Date.parse(data.modified) / 1000),
            date: data.modified,
            size: data.bytes,
            childs: has_childs,
            dirs: has_childs,
            tmb: data.thumb_exists ? 1 : null,
            read: 1,
            write: 1,
            locked: 0,
            volumeid: volumeId
        };

        //if (!init)
        //    cwd.phash = self.encryptPath(self.getParentPath(data.path));

        return cwd;
    };

    this.getMetadata = function (path, done, error) {
        var url = _API_URL + "metadata/sandbox" + encodeURI(path); // added encodeURI(path) to support unicode
        url = this.sign_url('GET', url);
        $.getJSON(url, done).error(error);
    }

    this.downloadFile = function (opts, path, done) {
        var url = _API_URL + "media/sandbox" + path;
        url = this.sign_url('POST', url, null, opts.customData.token_data);
        $.ajax({
            type: 'POST',
            url: url,
            success: function (data, textStatus, jqXHR) {
                done(data);
            },
            dataType: 'json'
        });
    }

    this.createNewFolder = function (root, path, done) {
        var url = _API_URL + "fileops/create_folder", data = {
            root: root,
            path: encodeURI(path) // added encodeURI(path) to support unicode
        };

        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {
                done(data);
            },
            dataType: 'json'
        });
    }

    this.restore = function (root, path, rev, done, error) {
        var url = _API_URL + "restore", data = {
            root: root,
            path: path,
            rev: rev
        };

        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {
                done(data);
            },
            dataType: 'json'
        });
    }

    this.remove = function (root, path, done) {
        var url = _API_URL + "fileops/delete", data = {
            root: root,
            path: path
        };

        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {
                done(data);
            },
            dataType: 'json'
        });
    }

    this.copy = function (root, from_path, to_path, cut, done, error) {
        var url = _API_URL + "fileops/" + (cut ? 'move' : 'copy'), self = this, data = {
            root: root,
            from_path: from_path,
            to_path: to_path
        };

        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {
                if (jqXHR.status == 200) {
                    done(data);
                } else {
                    error(getErrorResponse(jqXHR));
                }
            },
            error: function (jqXHR) {
                error(getErrorResponse(jqXHR));
            },
            dataType: 'json'
        });
    }

    /**
    * Creates and returns a Dropbox link (https://www.dropbox.com/help/167) to files or 
    * folders users can use to view a preview of the file in a web browser.
    */
    this.shares = function (root, path, done) {
        var url = _API_URL + "shares/" + root + encodeURI(path);
        url = this.sign_url('POST', url);
        $.ajax({
            type: 'POST',
            url: url,
            success: function (data, textStatus, jqXHR) {
                done(data);
            },
            dataType: 'json'
        });
    }

    this.fill_links = function (self, subject, links, opts, success, error, file_index, next) {

        var
            /**
            * the root whether it is sandbox or dropbox
            */
            root = opts.data.dropboxRoot,
            /**
            * hash of the target file or folder to get link of
            */
            hash = opts.data.targets[file_index],
            /**
            * path of the target file or folder to get link of
            */
            path = self.decryptPath(hash),
            link = {
                name: self.nameFromPath(path)
            };

        self.shares(root, path, function (data) {

            link.link = data;

            links.push(link);

            if ((file_index + 1) < opts.data.targets.length)
                next(self, subject, links, opts, success, error, ++file_index, next);
            else {

                self.send_via_email(subject, links, success, error);
            }

        });
    };

    this.removefile = function (self, opts, success, error, file_index, response, next) {
        var
            /**
            * the root whether it is sandbox or dropbox
            */
            root = opts.data.dropboxRoot,
            /**
            * hash of the target file or folder to be deleted
            */
            hash = opts.data.targets[file_index],
            /**
            * path of the target file or folder to be deleted after decrypting the hash
            */
            path = self.decryptPath(hash);

        /**
        * remove the target from dropbox
        */
        self.remove(root, path,
            /**
            * this function is called when the call to dropbox for remove succeed
            * the data parameter is the data returned from dropbox
            */
            function (data) {
                /**
                * Remove from cache
                */
                self.remove_entry(path);
                /**
                * add it to the removed targets as a successful removal
                */
                response.removed.push(hash);
                /**
                * if there are more files or folders in the targets array to be removed
                */
                if ((file_index + 1) < opts.data.targets.length)
                    next(self, opts, success, error, ++file_index, response, next);
                else
                    success(response);
            });

    }

    this.pastefile = function (self, opts, success, error, file_index, response, next) {
        var
		/**
		 * target file hash
		 */
		target = opts.data.targets[file_index],
		/**
		 * target path after decrypting the hash
		 */
		from = self.decryptPath(target),
        /**
        * the parent path of the target 
        * (will be used only "if the process is move not copy" to remove the target from cache)
        */
        fromParent = self.getParentPath(from),
		/**
		 * get file name from the target path
		 */
		fileName = self.nameFromPath(from),
		/**
		 * from directory path
		 */
		src = self.decryptPath(opts.data.src),
		/**
		 * to directory path
		 */
		dst = self.decryptPath(opts.data.dst),
		/**
		 * to file path
		 */
		to = dst + '/' + fileName;

        self.copy(opts.data.dropboxRoot, from, to, opts.data.cut,
            /**
            * this function is called when the call to dropbox for copy succeed
            * the data parameter is the data returned from dropbox
            */
            function (data) {
                /**
                * get the new "copied" cwd
                */
                var cwd = self.getCwd(data);
                /**
                * add it to response as a successful new copy
                */
                response.added.push(cwd);

                /**
                * if operation is move not copy, the target should be removed from the original place
                */
                if (opts.data.cut) {
                    /**
                    * remove it from presentation UI
                    */
                    response.removed.push(target);
                    /**
                    * remove it from the cache
                    */
                    self.remove_entry(from);
                }

                /**
                * set the new copy in chache
                */
                self.add_entry(to, data);

                /**
                * if there are more files or folders in the targets array to be copied or moved
                */
                if ((file_index + 1) < opts.data.targets.length)
                    next(self, opts, success, error, ++file_index, response, next);
                else
                    success(response);
            },
            function (response) {
                success(response);
            });
    }

    /**
    * This function is only used by the method of iframe uploading when XMLHttpRequest is undefined
    */
    this.convert_dropbox_response_of_uploaded_file = function (responseText) {
        var
        /**
        * A response to be returned to elFinder
        */
        response = {
            added: []
        },
        /**
		* metadata returned from Dropbox for the uploaded file
		*/
	    responseData = JSON.parse(responseText),
	    /**
		* path of the uploaded file
		*/
	    path = responseData.path,
	    /**
		* directory path of the uploaded file
		*/
	    parentPath = this.getParentPath(path),
	    /**
		* make cwd from metadata
		*/
	    cwd = this.getCwd(responseData);

        /**
         * add cwd to elfinder response 
         */
        response.added.push(cwd);

        /**
         * set in cache
         */
        this.add_entry(path, responseData);

        return response;
    }

    this.uploadFile = function (opts, self, xhr, dfrd, parentPath, files, file_index, response, next) {

        var
		/**
		 * file contents to upload
		 */
		file = files[file_index],
		/**
		 * path of the file to upload to 
		 */
        path = parentPath + '/' + file.name,
        /**
		 * encode the file path in order to support spaces and unicode
		 */
        path = encodeURI(path).replace(/&/g, '%26'),
		/**
		 * url to post the file to
		 */
		url = _CNT_URL + 'files_put/sandbox' + path;
        /**
		 * Sign the url
		 */
        url = self.sign_url('PUT', url, null, opts.customData.token_data);

        xhr.onreadystatechange = function (aEvt) {

            if (xhr.readyState == 4) {

                var status = xhr.status;

                if (status > 500) {

                    return dfrd.reject('errResponse');
                }
                if (status != 200) {

                    return dfrd.reject('errConnect');
                }

                var
				/**
				 * metadata returned from Dropbox for the uploaded file
				 */
				responseData = JSON.parse(xhr.responseText),
				/**
				 * path of the uploaded file
				 */
				path = responseData.path,
				/**
				 * directory path of the uploaded file
				 */
				parentPath = self.getParentPath(path),
				/**
				 * make cwd from metadata
				 */
				cwd = self.getCwd(responseData);

                /**
				 * add cwd to elfinder response 
				 */
                response.added.push(cwd);

                /**
				 * set in cache
				 */
                self.add_entry(path, responseData);


                if ((file_index + 1) < files.length)
                    next(opts, self, xhr, dfrd, parentPath, files, ++file_index, response, next);
                else
                    response.error ? dfrd.reject(response.error) : dfrd.resolve(response);
            }
        };


        xhr.open('PUT', url, true);
        xhr.send(file);
    };

    /******************************************************************************************************/
    /*************************************** CACHE HANDLERS ***********************************************/
    this.set_all_entries = function (entries) {
        localStorage.setItem("smartint_delta_entries", JSON.stringify(entries));
    };

    this.get_delta_entries = function () {
        return JSON.parse(localStorage.getItem("smartint_delta_entries"));
    };

    this.reset_all_entries = function () {
        localStorage.removeItem("smartint_delta_entries");
    };

    this.add_entry = function (path, entry) {
        var all_entries = this.get_delta_entries();
        all_entries.push([path, entry]);
        this.set_all_entries(all_entries);
    };

    this.does_entry_exist = function (path, entries) {
        var all_entries = entries || this.get_delta_entries();
        for (var entry, i = 0, len = all_entries.length; i < len; i++) {
            entry = all_entries[i];
            if (entry[0].toUpperCase() === path.toUpperCase() && entry[1]) {
                return true;
            }
        }
        return false;
    };

    this.get_entry = function (path, entries) {
        var all_entries = entries || this.get_delta_entries(), result;
        for (var entry, i = 0, len = all_entries.length; i < len; i++) {
            entry = all_entries[i];
            if (entry[0].toUpperCase() === path.toUpperCase() && entry[1]) {
                result = entry[1];
                return result;
            }
        }
        return null;
    };

    this.remove_entry = function (path) {
        var
        /**
        * Index of entry to be deleted
        */
        index,
        /**
        * Look for the entry in all entries
        */
        all_entries = this.get_delta_entries();
        /**
        * Loop on the cached "all entries" to find if the new entry exists or not
        */
        for (var entry, i = 0, len = all_entries.length; i < len; i++) {
            entry = all_entries[i];
            if (entry[0].toUpperCase() === path.toUpperCase()) {
                index = i;
                break;
            }
        }
        /**
        * Remove it
        */
        all_entries.splice(index, 1);
        /**
        * Set all entries
        */
        this.set_all_entries(all_entries);
    };

    this.set_delta_cursor = function (cursor) {
        localStorage.setItem("smartint_delta_cursor", cursor);
    };

    this.get_delta_cursor = function () {
        return localStorage.getItem("smartint_delta_cursor");
    };

    this.fill_files_in_path = function (path, init, entries, files, folders_only) {
        var cwd, all_entries = entries || this.get_delta_entries();

        for (var entry, i = 0, len = all_entries.length; i < len; i++) {

            entry = all_entries[i];

            if (entry[0].toUpperCase() === path.toUpperCase()) {

                if (entry[1]) {
                    cwd = this.getCwd(entry[1], init);
                    files.push(cwd);
                }

            }

            if (
                /**
                * If this file or directory is itself the given path or under the given path
                */
                entry[0].toUpperCase().indexOf(path.toUpperCase()) > -1 &&
                /**
                * But make sure it is under the given path
                */
                entry[0].split('/').length > path.split('/').length &&
                /**
                * Make sure there is object not null
                */
                entry[1]) {

                /**
                * check if the caller wants to fill folders only
                */
                if (folders_only) {
                    if (entry[1].is_dir) {
                        files.push(this.getCwd(entry[1]));
                    }
                }
                else {
                    files.push(this.getCwd(entry[1]));
                }

            }
        }

        return cwd;
    };
    /******************************************************************************************************/
    /******************************************************************************************************/

    /**
    * Initial call to delta without cursor to retrieve all entries
    * This is the first call to dropbox
    */
    this.init_delta = function (path, init, success) {

        var self = this, url = _API_URL + "delta", data = {};
        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {

                /**
                * reset cache 
                * Dropbox: If true, clear your local state before processing the delta entries. 
                * reset is always true on the initial call to /delta (i.e. when no cursor is passed in). 
                * Otherwise, it is true in rare situations, such as after server or account maintenance, 
                * or if a user deletes their app folder.
                */
                if (data.reset) {
                    self.reset_all_entries();
                }

                /**
                * Store the cursor for the next delta
                */
                self.set_delta_cursor(data.cursor);

                /**
                * Save the entries in the cache
                */
                self.set_all_entries(data.entries);

                //********************************************************************************************
                /**
                * process the elfinder success 
                * THIS IS THE ONLY REASON WE HAVE init_delta AND delta
                */
                var response = {}, files = [], cwd = self.fill_files_in_path(path, init, data.entries, files);
                response.cwd = cwd;
                response.files = files;
                if (init) {
                    response.uplMaxSize = '16M';
                    response.api = '2.0';
                }
                success(response);
                //********************************************************************************************

                /**
                * if there are more entries, call delta again
                */
                if (data.has_more) {
                    self.delta();
                }
                    /**
                    * else, call delta again after at least 5 minutes
                    */
                else {
                    setTimeout(function () {
                        self.delta();
                    }, 5 * 60 * 1000);
                }
            },
            dataType: 'json'
        });
    };

    /**
    * Dropbox: A way of letting you keep up with changes to files and folders in a user's Dropbox. 
    * You can periodically call /delta to get a list of "delta entries", 
    * which are instructions on how to update your local state to match the server's state.
    */
    this.delta = function () {

        var self = this, url = _API_URL + "delta", delta_cursor = self.get_delta_cursor(), data = {};

        if (delta_cursor) {
            data.cursor = delta_cursor;
        }

        url = this.sign_url('POST', url, data);

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function (data, textStatus, jqXHR) {
                //=========================== HANDLING DELTA =============================

                /**
                * reset cache 
                * Dropbox: If true, clear your local state before processing the delta entries. 
                * reset is always true on the initial call to /delta (i.e. when no cursor is passed in). 
                * Otherwise, it is true in rare situations, such as after server or account maintenance, 
                * or if a user deletes their app folder.
                */
                if (data.reset) {
                    self.reset_all_entries();
                }

                /**
                * Store the cursor for the next delta
                */
                self.set_delta_cursor(data.cursor);

                /**
                * Make sure there are changed entries between current and previous cursors
                * ya3ni fi files added or removed mn sa3et a5er delta l7ad el delta di
                */
                if (data.entries && data.entries.length > 0) {

                    /**
                    * Reference to all cached entries 
                    * 3ashan nezawed 3alehom aw nesheel menhom el 7agat ely et3'ayaret
                    */
                    var all_entries = self.get_delta_entries();

                    /**
                    * Entries to be deleted
                    * array of indexes not objects
                    */
                    var toBeDeleted = [];

                    /**
                    * Entries to be added
                    * array of objects not indexes
                    */
                    var toBeAdded = [];

                    /**
                    * Loop on the new entries
                    */
                    for (var new_entry, n = 0, j = data.entries.length; n < j; n++) {
                        /**
                        * Reference to a changed entry
                        */
                        new_entry = data.entries[n];
                        /**
                        * This changed entry already exists in the cached "all entries"
                        */
                        var found = false;
                        //-----------------------------------------------------------------
                        /**
                        * Loop on the cached "all entries" to find if the new entry exists or not
                        */
                        for (var entry, i = 0, len = all_entries.length; i < len; i++) {
                            /**
                            * entry by entry
                            */
                            entry = all_entries[i];
                            /**
                            * Compare by paths.. there should be a "encodeURI(path)" before comparing
                            * Am I right?
                            */
                            if (entry[0].toUpperCase() === new_entry[0].toUpperCase()) {

                                /**
                                * if found but not deleted
                                */
                                if (new_entry[1]) {
                                    /**
                                    * update it
                                    */
                                    all_entries[i] = new_entry;
                                }
                                else {
                                    /**
                                    * else, it is deleted, mark it to be deleted
                                    */
                                    toBeDeleted.push(i);
                                }

                                /**
                                * mark it as found
                                */
                                found = !found;

                                break;
                            }
                        }
                        //-----------------------------------------------------------------

                        /**
                        * if the changed entry was not found in cache
                        */
                        if (!found && new_entry[1])
                            /**
                            * then it is a new entry, mark it to be added
                            */
                            toBeAdded.push(new_entry);
                    }

                    /**
                    * First, Remove the entries marked to be removed
                    */
                    for (var i = 0; i < toBeDeleted.length; i++) {
                        all_entries.splice(toBeDeleted[i], 1);
                    }

                    /**
                    * Then, Add the entries marked to be added
                    */
                    for (var i = 0; i < toBeAdded.length; i++) {
                        all_entries.push(toBeAdded[i]);
                    }

                    /**
                    * Save all entries in cache
                    */
                    self.set_all_entries(all_entries);

                    /**
                    * Hash of the cwd path (current working directory)
                    * el folder el maftoo7 now odam el user
                    */
                    var target = window.elfinder_global_instance.cwd().hash;

                    /**
                    * Refresh the cwd
                    */
                    window.elfinder_global_instance.request({
                        data: { cmd: 'open', target: target }, syncOnFail: false
                    });
                }


                /**
                * if there are more entries, call delta again
                */
                if (data.has_more) {
                    self.delta();
                }
                    /**
                    * else, call delta again after at least 5 minutes
                    */
                else {
                    setTimeout(function () {
                        self.delta();
                    }, 5 * 60 * 1000);
                }

            },
            dataType: 'json'
        });

    };

    this.load_thumbnails = function (opts) {
        var self = this,
            root = opts.data.dropboxRoot,
            images = [],
            data = {
                format: "jpeg",
                size: "s"
            };

        for (var url, path, target, len = opts.data.targets.length, i = 0; i < len; i++) {
            target = opts.data.targets[i];
            path = self.decryptPath(target);
            url = _CNT_URL + "thumbnails/" + root + encodeURI(path);
            url = this.sign_url('GET', url, data);

            var alt_url = _CNT_URL + "thumbnails/" + root + encodeURI(path);
            alt_url = this.sign_url('GET', alt_url, data);

            images.push({
                /**
                * hash of the target file path
                */
                hash: target,
                /**
                * thumbnail url
                */
                tmb: url,
                /**
                * another thumbnail url with different nonce
                * (this is a bug in elfinder, it must use 2 urls)
                * (we cant pass the same url twice as dropbox won't process the second one)
                */
                alt_tmb: alt_url
            });


        }

        return images;
    };

    this.send_via_email = function (subject, links, success, error) {

        var body = '';

        for (var file, i = 0; i < links.length; i++) {
            file = links[i];
            body += file.name + ": " + file.link.url + " ";
        }

        //body = "hello";
        //body = encodeURI(body);

        //'<a href="' + file.link.url + '" title="expires on: ' + file.link.expires + '">' + file.name + "</a><br/>"
        /**
        * a fast hack to encode the html
        */
        //body = $('<div/>').text(body).html();

        var params = {};


        var
            etn = window.parent.Xrm.Page.data.entity.getEntityName(),
            etc = window.parent.Xrm.Page.context.getQueryStringParameters().etc,
            id = window.parent.Xrm.Page.data.entity.getId(),
            name_field_name = "fullname",
            name;

        if (etn === "account") {
            name_field_name = "name";
        }

        name = window.parent.Xrm.Page.getAttribute(name_field_name).getValue();

        params["pId"] = id;
        params["pType"] = etc;
        params["pName"] = name;
        params["partyid"] = id;
        params["partytype"] = etc;
        params["partyname"] = name;


        params["subject"] = body;
        //params["description"] = body;

        window.parent.Xrm.Utility.openEntityForm("email", null, params);

        success({});
    };
}

dropbox_smartint.prototype = {
    open: function (opts, success, error) {

        //if (opts.data.init && opts.data.tree) {
        //    localStorage.clear();
        //}

        var self = this,
        root = opts.data.dropboxRoot,
		/**
		 * The path to the dropbox folder or file
		 *
		 */
		path = ((opts.data.init && opts.data.tree) || (opts.data.init && !opts.data.target)) ?
		/**
		 * If init, then the path exists in opts.data.rootTarget and is not hashed
		 */
		opts.data.rootTarget :
		/**
		 * else, the path is hashed in opts.data.target and has to be decrypted
		 */
		this.decryptPath(opts.data.target);

        /**
        * If this is the initial call, call ini_delta and let it process the elfinder success
        */
        if (opts.data.init && opts.data.tree) {

            /**
            * If path does not exist, create it
            */
            this.getMetadata(path,
                /**
                * Path exists..
                */
                function (data) {

                    /**
                    * If Dropbox has metadata of the directory but the directory itself is deleted
                    */
                    if (data.is_deleted) {

                        /**
                        * Dropbox restores files only, we have to recreate the folder
                        * Else we would have called self.restore(root, path, data.rev);
                        */
                        self.createNewFolder(root, path, function (data) {
                            /**
                            * the new folder has been created
                            * ignore data and call delta for the first time
                            */
                            self.init_delta(path, opts.data.init, success);
                        });
                    }
                        /**
                        * Else, the directory exists on Dropbox
                        */
                    else {
                        /**
                        * ignore data and call delta for the first time
                        */
                        self.init_delta(path, opts.data.init, success);
                    }
                },
                /**
                * Error lookin up metadata of the path
                */
                function (jqXHR) {
                    /**
                    * Most likely 404, Path does not exist..
                    * This normally happens when user requests a path for the first time
                    * that doesn't exist on Dropbox and should be created.
                    */
                    self.createNewFolder(root, path, function (data) {
                        /**
                        * the new folder has been created
                        * ignore data and call delta for the first time
                        */
                        self.init_delta(path, opts.data.init, success);
                    });


                }
            );

            return this;
        }

        /**
        * else, we have cache. process the elfinder success directly from the cache
        */
        var response = {},
            /**
            * files array to be filled
            */
            files = [],
            /**
            * current working directory.. required by elfinder in the open cmd
            */
            cwd = self.fill_files_in_path(
                        /**
                        * path to target
                        */
                        path,
                        /**
                        * init = false.. this is not the initial call
                        */
                        false,
                        /**
                        * no changed entries, look in cache
                        */
                        null,
                        /**
                        * files array to be filled
                        */
                        files);

        response.cwd = cwd;
        response.files = files;
        success(response);
        return this;
    },
    rename: function (opts, success, error) {

        var self = this,
            response = {},
            from = self.decryptPath(opts.data.target),
            src = self.getParentPath(from),
            to = src + '/' + opts.data.name;

        self.copy(opts.data.dropboxRoot, from, to, true, function (data) {
            /**
            * get the new "copied" cwd
            */
            //var cwd = self.getCwd(data);
            /**
            * add it to response as a successful new copy
            */
            //response.added.push(cwd);
            /**
            * remove it from the cache
            */
            self.remove_entry(from);

            /**
            * set the new copy in chache
            */
            self.add_entry(to, data);

            opts.data.target = self.encryptPath(src);

            self.open(opts, success, error);
        });

        return this;
    },
    mkdir: function (opts, success, error) {
        var self = this,
        parentPath = this.decryptPath(opts.data.target),
        path = parentPath + '/' + opts.data.name,
        root = opts.data.dropboxRoot;

        this.createNewFolder(root, path, function (data) {
            var cwd = self.getCwd(data), response = {
                added: [cwd]
            };

            self.add_entry(path, data);

            success(response);
        });
        return this;
    },
    paste: function (opts, success, error) {

        var self = this, response = {
            added: [],
            removed: []
        };

        self.pastefile(self, opts, success, error, 0, response, self.pastefile);

        return this;
    },
    rm: function (opts, success, error) {

        var self = this, response = {
            removed: [],
            debug: self.getDebug()
        };

        self.removefile(self, opts, success, error, 0, response, self.removefile);

        return self;
    },
    tree: function (opts, success, error) {

        var self = this,
            path = this.decryptPath(opts.data.target);

        var response = {},
            /**
            * files array to be filled
            */
            files = [],
            /**
            * current working directory.. not required here by elfinder
            */
            cwd = self.fill_files_in_path(
                        /**
                        * path to target
                        */
                        path,
                        /**
                        * init = false.. this is not the initial call
                        */
                        false,
                        /**
                        * no changed entries, look in cache
                        */
                        null,
                        /**
                        * files array to be filled
                        */
                        files,
                        /**
                        * fill directories (folders) only, dont push files
                        */
                        true);

        response.tree = files;
        success(response);

        return this;
    },
    parents: function (opts, success, error) {
        var self = this,
            path = this.decryptPath(opts.data.target),
		    path = this.getParentPath(path);

        var response = {},
            /**
            * files array to be filled
            */
            files = [],
            /**
            * current working directory.. not required here by elfinder
            */
            cwd = self.fill_files_in_path(
                        /**
                        * path to target
                        */
                        path,
                        /**
                        * init = false.. this is not the initial call
                        */
                        false,
                        /**
                        * no changed entries, look in cache
                        */
                        null,
                        /**
                        * files array to be filled
                        */
                        files,
                        /**
                        * fill directories (folders) only, dont push files
                        */
                        true);

        response.tree = files;
        success(response);

        return this;
    },
    ls: function (opts, success, error) {

        var self = this,
            path = this.decryptPath(opts.data.target),
            files = [],
            cwd = this.fill_files_in_path(path, false, null, files);

        var response = {
            list: files
        };

        success(response);

        return this;
    },
    file: function (opts, files) {

        var i, j, hash, path;

        for (i = 0, j = files.length; i < j; i++) {
            hash = files[i].hash;
            path = this.decryptPath(hash),
            path = encodeURI(path);

            this.downloadFile(opts, path, function (data, error) {
                console.log(data);
                window.open(data.url, '_blank');
                window.focus();
            });
        }

        return this;
    },
    tmb: function (opts, success, error) {

        var self = this,
            root = opts.data.dropboxRoot,
            response = {};

        response.images = self.load_thumbnails(opts);

        success(response);

        return this;
    },
    sim: function (opts, success, error) {

        var self = this,
            targets = opts.data.targets,
            first = self.decryptPath(targets[0]),
            first_entry = self.get_entry(first),
            subject,
            links = [];

        if (targets.length == 1) {
            subject = self.nameFromPath(first);
        }
        else {
            var parent = self.getParentPath(first);
            subject = self.nameFromPath(parent);
        }

        self.fill_links(self, subject, links, opts, success, error, 0, self.fill_links);

    },
    request: function (opts, success, error) {
        this.elfinder_options = opts;
        this[opts.data.cmd](opts, success, error);
        return this;
    }
};

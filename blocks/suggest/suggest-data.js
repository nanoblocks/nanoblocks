(function($){

/**
 * Data source.
 */
var ds = function() {};

/**
 * @param {Object} options Data source options.
 */
ds.prototype.init = function(options) {
    this.options = options;
    this.cache = {};
    return this;
};

ds.prototype.has = function(key) {
    return (key.toLowerCase() in this.cache);
};

/**
 * Request data asyncronously.
 * @param {Object} req Request params.
 */
ds.prototype.get = function(req) {};

ds.prototype.getSync = function(key) {
    return this.cache[key.toLowerCase()];
};

/**
 * Raw data prepare. For example, to prepare data, that come from server.
 * @param {Object} data Raw data object.
 */
ds.prototype.prepareData = function(data) {
    return data;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Ajax data source.
 */
var ajaxDS = function() {};

nb.inherit(ajaxDS, ds);

ajaxDS.prototype.init = function(options) {
    ds.prototype.init.call(this, options);
    this._requests = {};

    this.url = options.url;
    this.retry_count = (typeof options.retry_count === 'undefined') ? 3 : +options.retry_count;
    this.max_items = options.max_items;
    this.timeout = options.timeout;
    this.dataType = options.dataType || 'jsonp';

    return this;
};

ajaxDS.prototype.get = function(req) {
    var query = req.key.toLowerCase();
    if (!(query in this._requests)) {
        this._createRequest(req);
    }
    this._requests[query].retry();
};

ajaxDS.prototype.createRequestData = function(text) {
    var query = {};
    query[this.options.query_param_name] = text;
    query[this.options.max_param_name] = this.max_items;
    return nb.extend({}, this.options.default_params, query);
};

/**
 * @param {{ key: string, onstart: function(), onsuccess: function(Object), onerror: function() }} req Request params.
 */
ajaxDS.prototype._createRequest = function(req) {
    var that = this;
    var query = req.key.toLowerCase();

    if (query in this._requests) {
        return;
    }

    var request = {
        "retries_left": this.retry_count,
        'retry': null
    };

    request.retry = function() {
        if (request.retries_left === 0) {
            req.onfail(); // Sorry, no more retries.
            delete that._requests[query]; // Clear old request. Maybe at some moment (later) we can get needed data.
            return;
        }

        req.onstart();
        var params = that.createRequestData(query);

        $.ajax({
            'url': that.url,
            'type': 'GET',
            'data': params,
            'dataType': that.dataType,
            'success': function(data) {
                var parsed_data = that.prepareData(data, !params.q);
                that.cache[query] = parsed_data;
                req.onsuccess(parsed_data);
            },
            'error': function() {
                request.retry();
            },
            'timeout': that.timeout
        });

        request.retries_left--;
    };

    this._requests[query] = request;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Static array data source.
 */
var arrayDS = function() {};

nb.inherit(arrayDS, ds);

/**
 * @param {Array.<Object>} ar An array with data.
 */
arrayDS.prototype.init = function(options) {
    ds.prototype.init.call(this, options);
    this._keys = null; // Cache keys for faster search.

    this.key_name = options.key;
    this.ar = this.prepareData(options.data);

    return this;
};

arrayDS.prototype.prepareData = function(ar) {
    ar = ar.slice(0); // Create copy, cause sort() modify initial array.
    // // TODO кажется, сортировка, всё-таки, не нужна.
    // var key = this.key_name;
    // ar.sort(function(a, b) {
    //     return a[key] > b[key];
    // });
    return ar;
};

/**
 * @param req
 */
arrayDS.prototype.get = function(req) {
    var found = [];
    var ar = this.ar;
    var keys = this._keys;
    var key_name = this.key_name;
    var query = req.key.toLowerCase();
    var item;
    var key;
    var i;

    req.onstart();

    // If already in cache.
    if (query in this.cache) {
        req.onsuccess(this.cache[query]);
        return;
    }

    // Search.
    if (keys) {
        for (i = 0; i < keys.length; i++) {
            item = ar[i];
            key = keys[i];
            if (match(key, query)) {
                found.push(item);
            }
        }
    }
    else {
        keys = this._keys = [];
        for (i = 0; i < ar.length; i++) {
            item = ar[i];
            key = keys[i] = ('' + item[key_name]).toLowerCase();
            if (match(key, query)) {
                found.push(item);
            }
        }
    }

    // Save in cache.
    this.cache[query] = found;

    req.onsuccess(found);
    return;

    function match(key, query) {
        return ( key.indexOf(query) >= 0 );
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.suggest = {};
nb.suggest.ds = ds;
nb.suggest.ajaxDS = ajaxDS;
nb.suggest.arrayDS = arrayDS;

}(jQuery));

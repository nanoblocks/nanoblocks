(function($){

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Data source.
 * Any inheritor as usual needs to implement only the get method.
 */
var ds = function() {};

ds.prototype.init = function() {
    this.cache = {};
};

ds.prototype.has = function(key) {
    return ((key.toLowerCase()) in this.cache);
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
 * @param {{ url: string, retry_count: ?number=3, max_items: ?number=, timeout: number= }} options.
 */
var ajaxDS = function(options) {
    this.super_.init();

    this.url = options.url;
    this.retry_count = (typeof options.retry_count === 'undefined') ? 3 : +options.retry_count;
    this.max_items = options.max_items;
    this.timeout = options.timeout;

    this.requests = {};
};

nb.inherit(ajaxDS, ds);

// ----------------------------------------------------------------------------------------------------------------- //

ajaxDS.prototype.get = function(req) {
    if (!(req.key in this.requests)) {
        this._createRequest(req);
    }
    this.requests[req.key].retry();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @param {{ key: string, onstart: function(), onsuccess: function(Object), onerror: function() }} req Request params.
 */
ajaxDS.prototype._createRequest = function(req) {
    var that = this;

    if (req.key in this.requests) {
        return;
    }

    var data = {
        'text': req.key,
        'max': this.max_items
    };

    var request = {
        "retries_left": this.retry_count,
        'retry': null
    };

    request.retry = function() {
        if (request.retries_left === 0) {
            req.onfail(); // Sorry, no more retries.
            delete that.requests[req.key]; // Clear old request. Maybe at some moment (later) we can get needed data.
            return;
        }

        req.onstart();

        $.ajax({
            'url': that.url,
            'type': 'GET',
            'data': data,
            'dataType': 'jsonp',
            'success': function(data) {
                var parsed_data = that.prepareData(data);
                that.cache[req.key] = parsed_data;
                req.onsuccess(parsed_data);
            },
            'error': function() {
                request.retry();
            },
            'timeout': that.timeout
        });

        request.retries_left--;
    };

    this.requests[req.key] = request;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Static array data source.
 * @param {Array.<Object>} ar An array with data.
 */
var arrayDS = function(ar, key_name) {
    this.super_.init();
    this.key_name = key_name;
    this._keys = null; // Cache keys for faster search.
    this.ar = this.prepareData(ar);
};

nb.inherit(arrayDS, ds);

// ----------------------------------------------------------------------------------------------------------------- //

arrayDS.prototype.prepareData = function(ar) {
    ar = ar.slice(0); // Create copy, cause sort() modify initial array.
// TODO кажется, сортировка, всё-таки, не нужна.
//    var key = this.key_name;
//    ar.sort(function(a, b) {
//        return a[key] > b[key];
//    });
    return ar;
};

// ----------------------------------------------------------------------------------------------------------------- //

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
        return (key.indexOf(query) >= 0);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.suggest = {};
nb.suggest.ajaxDS = ajaxDS;
nb.suggest.arrayDS = arrayDS;

}(jQuery));